/*
  Warnings:

  - You are about to drop the `ExpenseByCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PurchaseSummary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Purchases` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExpenseByCategory" DROP CONSTRAINT "ExpenseByCategory_expenseSummaryId_fkey";

-- DropForeignKey
ALTER TABLE "Purchases" DROP CONSTRAINT "Purchases_productId_fkey";

-- DropTable
DROP TABLE "ExpenseByCategory";

-- DropTable
DROP TABLE "PurchaseSummary";

-- DropTable
DROP TABLE "Purchases";
