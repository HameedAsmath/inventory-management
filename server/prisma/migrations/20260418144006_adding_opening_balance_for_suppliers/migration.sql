-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "closingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "openingOutstanding" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalOutstanding" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "paymentId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "PaymentType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("paymentId")
);

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("supplierId") ON DELETE RESTRICT ON UPDATE CASCADE;
