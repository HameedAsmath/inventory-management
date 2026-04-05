-- AlterTable: existing rows get default 10 in PostgreSQL when adding NOT NULL + DEFAULT
ALTER TABLE "Products" ADD COLUMN "lowStockQuantity" INTEGER NOT NULL DEFAULT 10;
