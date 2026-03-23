import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getDashboardMetrics = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const popularProducts = await prisma.products.findMany({
      take: 15,
      orderBy: {
        stockQuantity: "desc",
      },
    });
    const salesSummary = await prisma.salesSummary.findMany({
      take: 5,
      orderBy: {
        date: "desc",
      },
    });
    res.json({
      popularProducts,
      salesSummary,
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving dashboard metrics" });
  }
};
