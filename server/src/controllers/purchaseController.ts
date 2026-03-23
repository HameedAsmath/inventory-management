import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

type PurchaseItemInput = {
  productId: string;
  quantity: number;
  costPrice: number;
};

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export const createPurchase = async (req: Request, res: Response) => {
  try {
    const { supplierId, purchaseDate, notes, items } = req.body as {
      supplierId?: string;
      purchaseDate?: string;
      notes?: string;
      items?: PurchaseItemInput[];
    };

    if (!supplierId) {
      return res.status(400).json({ message: "supplierId is required" });
    }
    if (!purchaseDate) {
      return res.status(400).json({ message: "purchaseDate is required" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one purchase item is required" });
    }

    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({ message: "productId is required for all items" });
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return res
          .status(400)
          .json({ message: "quantity must be a positive number for all items" });
      }
      if (!Number.isFinite(item.costPrice) || item.costPrice <= 0) {
        return res
          .status(400)
          .json({ message: "costPrice must be a positive number for all items" });
      }
    }

    const uniqueProductIds = [...new Set(items.map((item) => item.productId))];
    const products = await prisma.products.findMany({
      where: { productId: { in: uniqueProductIds } },
      select: { productId: true, name: true },
    });
    if (products.length !== uniqueProductIds.length) {
      return res.status(400).json({ message: "One or more products were not found" });
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + Number(item.quantity) * Number(item.costPrice),
      0,
    );

    const purchase = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { supplierId: String(supplierId) },
      });
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      const createdPurchase = await tx.purchase.create({
        data: {
          supplierId: String(supplierId),
          purchaseDate: new Date(purchaseDate),
          notes: notes ? String(notes).trim() : null,
          totalAmount,
        },
      });

      for (const item of items) {
        const quantity = Number(item.quantity);
        const costPrice = Number(item.costPrice);
        const totalCost = quantity * costPrice;

        await tx.purchaseItem.create({
          data: {
            purchaseId: createdPurchase.purchaseId,
            productId: item.productId,
            quantity,
            costPrice,
            totalCost,
          },
        });

        await tx.products.update({
          where: { productId: item.productId },
          data: {
            stockQuantity: { increment: quantity },
            cp: costPrice,
          },
        });
      }

      return tx.purchase.findUnique({
        where: { purchaseId: createdPurchase.purchaseId },
        include: {
          supplier: true,
          purchaseItems: {
            include: { product: true },
          },
        },
      });
    });

    res.status(201).json(purchase);
  } catch (error: any) {
    if (error?.message === "Supplier not found") {
      return res.status(404).json({ message: "Supplier not found" });
    }
    console.error("Error creating purchase:", error);
    res.status(500).json({ message: "Error creating purchase" });
  }
};

export const getPurchases = async (_req: Request, res: Response) => {
  try {
    const purchases = await prisma.purchase.findMany({
      include: {
        supplier: true,
        purchaseItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: [{ purchaseDate: "desc" }, { createdAt: "desc" }],
    });
    res.json(purchases);
  } catch (error) {
    console.error("Error retrieving purchases:", error);
    res.status(500).json({ message: "Error retrieving purchases" });
  }
};

export const getPurchaseById = async (req: Request, res: Response) => {
  try {
    const purchaseId = String(req.params.purchaseId);
    const purchase = await prisma.purchase.findUnique({
      where: { purchaseId },
      include: {
        supplier: true,
        purchaseItems: {
          include: { product: true },
        },
      },
    });
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }
    res.json(purchase);
  } catch (error) {
    console.error("Error retrieving purchase:", error);
    res.status(500).json({ message: "Error retrieving purchase" });
  }
};

export const getPurchaseAnalytics = async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const [todayAgg, totalAgg, products, purchaseItems, purchases] = await Promise.all([
      prisma.purchase.aggregate({
        where: { purchaseDate: { gte: startOfToday, lte: endOfToday } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.purchase.aggregate({
        _sum: { totalAmount: true },
        _count: { _all: true },
      }),
      prisma.products.findMany({
        select: {
          productId: true,
          name: true,
          stockQuantity: true,
          cp: true,
        },
      }),
      prisma.purchaseItem.findMany({
        select: {
          productId: true,
          quantity: true,
          totalCost: true,
          product: { select: { name: true } },
        },
      }),
      prisma.purchase.findMany({
        select: { purchaseDate: true, totalAmount: true },
      }),
    ]);

    const stockValue = products.reduce(
      (sum, product) => sum + product.stockQuantity * (product.cp ?? 0),
      0,
    );
    const totalStockUnits = products.reduce(
      (sum, product) => sum + product.stockQuantity,
      0,
    );
    const outOfStockCount = products.filter((product) => product.stockQuantity === 0).length;
    const lowStockCount = products.filter(
      (product) => product.stockQuantity > 0 && product.stockQuantity < 10,
    ).length;

    const purchasedProductMap = new Map<
      string,
      { productId: string; productName: string; totalQuantity: number; totalCost: number }
    >();
    purchaseItems.forEach((item) => {
      const existing = purchasedProductMap.get(item.productId);
      if (existing) {
        existing.totalQuantity += item.quantity;
        existing.totalCost += item.totalCost;
      } else {
        purchasedProductMap.set(item.productId, {
          productId: item.productId,
          productName: item.product.name,
          totalQuantity: item.quantity,
          totalCost: item.totalCost,
        });
      }
    });

    const topPurchasedProducts = Array.from(purchasedProductMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);

    const monthlyTrendMap = new Map<
      string,
      { month: string; totalCost: number; purchaseCount: number }
    >();
    purchases.forEach((purchase) => {
      const month = getMonthLabel(new Date(purchase.purchaseDate));
      const existing = monthlyTrendMap.get(month);
      if (existing) {
        existing.totalCost += purchase.totalAmount;
        existing.purchaseCount += 1;
      } else {
        monthlyTrendMap.set(month, {
          month,
          totalCost: purchase.totalAmount,
          purchaseCount: 1,
        });
      }
    });

    const monthlyPurchaseTrend = Array.from(monthlyTrendMap.values()).sort((a, b) => {
      const dA = new Date(`01 ${a.month}`);
      const dB = new Date(`01 ${b.month}`);
      return dA.getTime() - dB.getTime();
    });

    res.json({
      totalPurchasesToday: todayAgg._sum.totalAmount ?? 0,
      todayPurchaseCount: todayAgg._count._all ?? 0,
      totalPurchaseCost: totalAgg._sum.totalAmount ?? 0,
      purchaseCount: totalAgg._count._all ?? 0,
      topPurchasedProducts,
      stockLevels: {
        totalProducts: products.length,
        totalStockUnits,
        lowStockCount,
        outOfStockCount,
      },
      stockValue,
      monthlyPurchaseTrend,
    });
  } catch (error) {
    console.error("Error retrieving purchase analytics:", error);
    res.status(500).json({ message: "Error retrieving purchase analytics" });
  }
};
