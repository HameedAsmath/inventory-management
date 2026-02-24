-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'success', 'cancelled');

-- CreateTable
CREATE TABLE "Products" (
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price1" DOUBLE PRECISION NOT NULL,
    "price2" DOUBLE PRECISION NOT NULL,
    "category" TEXT,
    "stockQuantity" INTEGER NOT NULL,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "Sales" (
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Sales_pkey" PRIMARY KEY ("saleId")
);

-- CreateTable
CREATE TABLE "Purchases" (
    "purchaseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Purchases_pkey" PRIMARY KEY ("purchaseId")
);

-- CreateTable
CREATE TABLE "SalesSummary" (
    "salesSummaryId" TEXT NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,
    "changePercentage" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesSummary_pkey" PRIMARY KEY ("salesSummaryId")
);

-- CreateTable
CREATE TABLE "PurchaseSummary" (
    "purchaseSummaryId" TEXT NOT NULL,
    "totalPurchased" DOUBLE PRECISION NOT NULL,
    "changePercentage" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseSummary_pkey" PRIMARY KEY ("purchaseSummaryId")
);

-- CreateTable
CREATE TABLE "ExpenseSummary" (
    "expenseSummaryId" TEXT NOT NULL,
    "totalExpenses" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseSummary_pkey" PRIMARY KEY ("expenseSummaryId")
);

-- CreateTable
CREATE TABLE "ExpenseByCategory" (
    "expenseByCategoryId" TEXT NOT NULL,
    "expenseSummaryId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseByCategory_pkey" PRIMARY KEY ("expenseByCategoryId")
);

-- CreateTable
CREATE TABLE "Customer" (
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "Billing" (
    "billingId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("billingId")
);

-- CreateTable
CREATE TABLE "Expense" (
    "expenseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("expenseId")
);

-- CreateTable
CREATE TABLE "BillingItem" (
    "billingItemId" TEXT NOT NULL,
    "billingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BillingItem_pkey" PRIMARY KEY ("billingItemId")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "shopName" TEXT NOT NULL DEFAULT 'My Shop',
    "shopAddress" TEXT NOT NULL DEFAULT '',
    "shopPincode" TEXT NOT NULL DEFAULT '',
    "shopContact" TEXT NOT NULL DEFAULT '',
    "shopEmail" TEXT NOT NULL DEFAULT '',
    "shopGst" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchases" ADD CONSTRAINT "Purchases_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("productId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseByCategory" ADD CONSTRAINT "ExpenseByCategory_expenseSummaryId_fkey" FOREIGN KEY ("expenseSummaryId") REFERENCES "ExpenseSummary"("expenseSummaryId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("customerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingItem" ADD CONSTRAINT "BillingItem_billingId_fkey" FOREIGN KEY ("billingId") REFERENCES "Billing"("billingId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingItem" ADD CONSTRAINT "BillingItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Products"("productId") ON DELETE RESTRICT ON UPDATE CASCADE;
