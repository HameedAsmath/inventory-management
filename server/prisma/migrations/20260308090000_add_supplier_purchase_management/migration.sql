-- Create suppliers table
CREATE TABLE "Supplier" (
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("supplierId")
);

-- Create purchases table
CREATE TABLE "Purchase" (
    "purchaseId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("purchaseId")
);

-- Create purchase items table
CREATE TABLE "PurchaseItem" (
    "purchaseItemId" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("purchaseItemId")
);

ALTER TABLE "Purchase"
ADD CONSTRAINT "Purchase_supplierId_fkey"
FOREIGN KEY ("supplierId") REFERENCES "Supplier"("supplierId")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PurchaseItem"
ADD CONSTRAINT "PurchaseItem_purchaseId_fkey"
FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("purchaseId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurchaseItem"
ADD CONSTRAINT "PurchaseItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Products"("productId")
ON DELETE RESTRICT ON UPDATE CASCADE;
