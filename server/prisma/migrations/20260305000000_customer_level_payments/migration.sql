-- Add customer-level balances.
ALTER TABLE "Customer"
ADD COLUMN "totalOutstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "totalCredit" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Create payment type enum and payment history table.
CREATE TYPE "PaymentType" AS ENUM ('payment', 'advance');

CREATE TABLE "CustomerPayment" (
    "paymentId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "PaymentType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerPayment_pkey" PRIMARY KEY ("paymentId")
);

CREATE INDEX "CustomerPayment_customerId_timestamp_idx" ON "CustomerPayment"("customerId", "timestamp");

ALTER TABLE "CustomerPayment"
ADD CONSTRAINT "CustomerPayment_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("customerId")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill outstanding and credit from historical bill-level data.
UPDATE "Customer" c
SET
  "totalOutstanding" = COALESCE((
    SELECT SUM(GREATEST(b."totalAmount" - b."paidAmount", 0))
    FROM "Billing" b
    WHERE b."customerId" = c."customerId"
      AND b."paymentStatus" <> 'cancelled'
  ), 0),
  "totalCredit" = COALESCE((
    SELECT SUM(GREATEST(b."paidAmount" - b."totalAmount", 0))
    FROM "Billing" b
    WHERE b."customerId" = c."customerId"
      AND b."paymentStatus" <> 'cancelled'
  ), 0);

-- Backfill payment history (paid portion against outstanding).
INSERT INTO "CustomerPayment" ("paymentId", "customerId", "amount", "type", "timestamp")
SELECT
  md5(random()::text || clock_timestamp()::text || b."billingId" || '-payment'),
  b."customerId",
  LEAST(b."paidAmount", b."totalAmount"),
  'payment'::"PaymentType",
  b."timestamp"
FROM "Billing" b
WHERE b."paymentStatus" <> 'cancelled'
  AND b."paidAmount" > 0;

-- Backfill payment history (overpaid portion as advance credit).
INSERT INTO "CustomerPayment" ("paymentId", "customerId", "amount", "type", "timestamp")
SELECT
  md5(random()::text || clock_timestamp()::text || b."billingId" || '-advance'),
  b."customerId",
  GREATEST(b."paidAmount" - b."totalAmount", 0),
  'advance'::"PaymentType",
  b."timestamp"
FROM "Billing" b
WHERE b."paymentStatus" <> 'cancelled'
  AND b."paidAmount" > b."totalAmount";

-- Remove bill-level payment tracking fields.
ALTER TABLE "Billing"
DROP COLUMN "paidAmount",
DROP COLUMN "paymentStatus";
