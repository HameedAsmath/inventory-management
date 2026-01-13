/*
  Warnings:

  - You are about to drop the column `totalValue` on the `PurchaseSummary` table. All the data in the column will be lost.
  - You are about to drop the column `timeStamp` on the `Purchases` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `Sales` table. All the data in the column will be lost.
  - Added the required column `totalPurchased` to the `PurchaseSummary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timestamp` to the `Purchases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PurchaseSummary" DROP COLUMN "totalValue",
ADD COLUMN     "totalPurchased" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Purchases" DROP COLUMN "timeStamp",
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Sales" DROP COLUMN "totalPrice",
ADD COLUMN     "totalAmount" DOUBLE PRECISION NOT NULL;
