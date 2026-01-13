import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getExpensesByCategory = async (req: Request, res: Response) => {
  try {
    const expensesByCategoryRaw = await prisma.expenseByCategory.findMany({
      orderBy: {
        date: "desc",
      },
    });
    const expensesByCategorySummary = expensesByCategoryRaw.map((expense) => ({
      ...expense,
      amount: expense.amount.toString(),
    }));
    res.json(expensesByCategorySummary);
  } catch (error) {
    res.status(500).json({ message: "Error Retrieving Expenses by Category" });
  }
};
