ALTER TABLE "Products"
ADD COLUMN "serialNumber" TEXT;

UPDATE "Products"
SET "serialNumber" = 'SN-' || SUBSTRING(REPLACE("productId", '-', '') FROM 1 FOR 8)
WHERE "serialNumber" IS NULL;

ALTER TABLE "Products"
ALTER COLUMN "serialNumber" SET NOT NULL;

CREATE UNIQUE INDEX "Products_serialNumber_key" ON "Products"("serialNumber");
