import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

const DEFAULT_LOW_STOCK_QUANTITY = 10;
const MIN_SERIAL_NUMBER_LENGTH = 3;

function parseLowStockQuantity(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return null;
  }
  return n;
}

// Normalize category name: trim spaces, handle case sensitivity
const normalizeCategory = (
  category: string | undefined | null,
): string | null => {
  if (!category || typeof category !== "string") return null;
  // Trim and normalize spaces (replace multiple spaces with single space)
  const normalized = category.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : null;
};

function normalizeSerialNumber(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim();
  if (normalized.length < MIN_SERIAL_NUMBER_LENGTH) return null;
  return normalized;
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const search = req.query.search?.toString();
    const category = req.query.category?.toString();

    const where: any = {};

    const searchFilter = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { serialNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    if (search) {
      where.OR = searchFilter.OR;
    }

    // Handle special filter cases (per-product threshold: stock < lowStockQuantity, in stock)
    if (category === "low-stock") {
      const baseWhere = searchFilter;
      const list = await prisma.products.findMany({
        where: baseWhere,
        orderBy: { name: "asc" },
      });
      const filtered = list.filter(
        (p) =>
          p.stockQuantity > 0 && p.stockQuantity < p.lowStockQuantity,
      );
      return res.json(filtered);
    } else if (category === "out-of-stock") {
      where.stockQuantity = 0;
    } else if (category && category !== "all") {
      // Filter by specific category - need to normalize and match
      const normalizedCategory = normalizeCategory(category);
      if (normalizedCategory) {
        // Get all products first to filter by normalized category
        const allProducts = await prisma.products.findMany({
          where: searchFilter,
          orderBy: {
            name: "asc",
          },
        });

        // Filter by normalized category (case-insensitive, space-normalized)
        const filtered = allProducts.filter((p) => {
          if (!p.category) return false;
          return normalizeCategory(p.category) === normalizedCategory;
        });

        return res.json(filtered);
      }
    }

    const products = await prisma.products.findMany({
      where,
      orderBy: {
        name: "asc",
      },
    });
    res.json(products);
  } catch (error) {
    console.error("Error retrieving products:", error);
    res.status(500).json({ message: "Error Retrieving Products" });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      productId,
      name,
      price1,
      price2,
      cp,
      stockQuantity,
      serialNumber: serialNumberRaw,
      category,
      lowStockQuantity: lowStockRaw,
    } = req.body;
    if (
      !name ||
      price1 === undefined ||
      stockQuantity === undefined
    ) {
      return res.status(400).json({
        message: "name, price1, and stockQuantity are required",
      });
    }
    let serialNumber: string | null = null;
    if (serialNumberRaw !== undefined) {
      serialNumber = normalizeSerialNumber(serialNumberRaw);
      if (!serialNumber) {
        return res.status(400).json({
          message: `serialNumber must be at least ${MIN_SERIAL_NUMBER_LENGTH} characters`,
        });
      }
    }

    let lowStockQuantity: number;
    if (
      lowStockRaw === undefined ||
      lowStockRaw === null ||
      lowStockRaw === ""
    ) {
      lowStockQuantity = DEFAULT_LOW_STOCK_QUANTITY;
    } else {
      const parsedLow = parseLowStockQuantity(lowStockRaw);
      if (parsedLow === null) {
        return res.status(400).json({
          message: "lowStockQuantity must be a non-negative integer",
        });
      }
      lowStockQuantity = parsedLow;
    }

    // Normalize category
    const normalizedCategory = normalizeCategory(category);

    const product = await prisma.products.create({
      data: {
        productId,
        serialNumber,
        name,
        price1,
        price2: price2 ?? null,
        cp: cp ?? null,
        stockQuantity,
        lowStockQuantity,
        category: normalizedCategory,
      },
    });
    res.status(201).json(product);
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = String(error?.meta?.target ?? "");
      if (target.includes("serialNumber")) {
        return res.status(400).json({ message: "Serial number already exists" });
      }
      return res.status(400).json({ message: "Product ID already exists" });
    }
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Error Creating Product" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const {
      name,
      price1,
      price2,
      cp,
      stockQuantity,
      serialNumber: serialNumberRaw,
      category,
      lowStockQuantity: lowStockRaw,
    } = req.body;

    let lowStockUpdate: { lowStockQuantity: number } | undefined;
    if (lowStockRaw !== undefined) {
      const parsed = parseLowStockQuantity(lowStockRaw);
      if (parsed === null) {
        return res.status(400).json({
          message: "lowStockQuantity must be a non-negative integer",
        });
      }
      lowStockUpdate = { lowStockQuantity: parsed };
    }

    let serialNumberUpdate: { serialNumber: string | null } | undefined;
    if (serialNumberRaw !== undefined) {
      if (serialNumberRaw === null || serialNumberRaw === "") {
        serialNumberUpdate = { serialNumber: null };
      } else {
      const serialNumber = normalizeSerialNumber(serialNumberRaw);
        if (!serialNumber) {
          return res.status(400).json({
            message: `serialNumber must be at least ${MIN_SERIAL_NUMBER_LENGTH} characters`,
          });
        }
        serialNumberUpdate = { serialNumber };
      }
    }

    const product = await prisma.products.update({
      where: { productId: String(productId) },
      data: {
        ...(name !== undefined && { name }),
        ...(price1 !== undefined && { price1 }),
        ...(price2 !== undefined && { price2 }),
        ...(cp !== undefined && { cp }),
        ...(stockQuantity !== undefined && { stockQuantity }),
        ...serialNumberUpdate,
        ...lowStockUpdate,
        ...(category !== undefined && {
          category: normalizeCategory(category),
        }),
      },
    });
    res.json(product);
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = String(error?.meta?.target ?? "");
      if (target.includes("serialNumber")) {
        return res.status(400).json({ message: "Serial number already exists" });
      }
    }
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Product not found" });
    }
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Error Updating Product" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const productId = String(req.params.productId);

    const product = await prisma.products.findUnique({
      where: { productId },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const [billingItemCount, purchaseItemCount, salesCount] = await Promise.all([
      prisma.billingItem.count({ where: { productId } }),
      prisma.purchaseItem.count({ where: { productId } }),
      prisma.sales.count({ where: { productId } }),
    ]);

    if (
      billingItemCount > 0 ||
      purchaseItemCount > 0 ||
      salesCount > 0
    ) {
      const reasons: string[] = [];
      if (billingItemCount > 0) {
        reasons.push(
          `${billingItemCount} billing line${billingItemCount === 1 ? "" : "s"}`,
        );
      }
      if (purchaseItemCount > 0) {
        reasons.push(
          `${purchaseItemCount} purchase line${purchaseItemCount === 1 ? "" : "s"}`,
        );
      }
      if (salesCount > 0) {
        reasons.push(
          `${salesCount} sales record${salesCount === 1 ? "" : "s"}`,
        );
      }
      return res.status(409).json({
        message: `This product cannot be deleted because it is still linked to ${reasons.join(", ")}.`,
      });
    }

    await prisma.products.delete({ where: { productId } });
    res.json({ message: "Product deleted", productId });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Error deleting product" });
  }
};
