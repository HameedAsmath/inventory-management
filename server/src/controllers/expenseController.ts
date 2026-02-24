import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { randomUUID } from "crypto";

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { title, description, amount, status } = req.body;

    if (!title || !amount) {
      return res.status(400).json({
        message: "title and amount are required",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        message: "amount must be greater than 0",
      });
    }

    const expense = await prisma.expense.create({
      data: {
        expenseId: randomUUID(),
        title,
        description: description || null,
        amount,
        status: status || "pending",
      },
    });

    res.status(201).json(expense);
  } catch (error: any) {
    console.error("Error creating expense:", error);
    res.status(500).json({ message: "Error creating expense" });
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status && ["pending", "success", "cancelled"].includes(status as string)) {
      where.status = status;
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: {
        timestamp: "desc",
      },
    });

    res.json(expenses);
  } catch (error: any) {
    console.error("Error retrieving expenses:", error);
    res.status(500).json({ 
      message: "Error retrieving expenses",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

export const getExpenseById = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const expense = await prisma.expense.findUnique({
      where: { expenseId: String(expenseId) },
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.json(expense);
  } catch (error) {
    console.error("Error retrieving expense:", error);
    res.status(500).json({ message: "Error retrieving expense" });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const { title, description, amount, status } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) {
      if (amount <= 0) {
        return res.status(400).json({
          message: "amount must be greater than 0",
        });
      }
      updateData.amount = amount;
    }
    if (status !== undefined) {
      if (!["pending", "success", "cancelled"].includes(status)) {
        return res.status(400).json({
          message: "status must be one of: pending, success, cancelled",
        });
      }
      updateData.status = status;
    }

    const expense = await prisma.expense.update({
      where: { expenseId: String(expenseId) },
      data: updateData,
    });

    res.json(expense);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Expense not found" });
    }
    console.error("Error updating expense:", error);
    res.status(500).json({ message: "Error updating expense" });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    await prisma.expense.delete({
      where: { expenseId: String(expenseId) },
    });

    res.json({ message: "Expense deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Expense not found" });
    }
    console.error("Error deleting expense:", error);
    res.status(500).json({ message: "Error deleting expense" });
  }
};
