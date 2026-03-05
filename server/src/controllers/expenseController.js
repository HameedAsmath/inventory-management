var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { prisma } from "../lib/prisma";
import { randomUUID } from "crypto";
export const createExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const expense = yield prisma.expense.create({
            data: {
                expenseId: randomUUID(),
                title,
                description: description || null,
                amount,
                status: status || "pending",
            },
        });
        res.status(201).json(expense);
    }
    catch (error) {
        console.error("Error creating expense:", error);
        res.status(500).json({ message: "Error creating expense" });
    }
});
export const getExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status } = req.query;
        const where = {};
        if (status && ["pending", "success", "cancelled"].includes(status)) {
            where.status = status;
        }
        const expenses = yield prisma.expense.findMany({
            where,
            orderBy: {
                timestamp: "desc",
            },
        });
        res.json(expenses);
    }
    catch (error) {
        console.error("Error retrieving expenses:", error);
        res.status(500).json({
            message: "Error retrieving expenses",
            error: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});
export const getExpenseById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { expenseId } = req.params;
        const expense = yield prisma.expense.findUnique({
            where: { expenseId: String(expenseId) },
        });
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }
        res.json(expense);
    }
    catch (error) {
        console.error("Error retrieving expense:", error);
        res.status(500).json({ message: "Error retrieving expense" });
    }
});
export const updateExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { expenseId } = req.params;
        const { title, description, amount, status } = req.body;
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (description !== undefined)
            updateData.description = description;
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
        const expense = yield prisma.expense.update({
            where: { expenseId: String(expenseId) },
            data: updateData,
        });
        res.json(expense);
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Expense not found" });
        }
        console.error("Error updating expense:", error);
        res.status(500).json({ message: "Error updating expense" });
    }
});
export const deleteExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { expenseId } = req.params;
        yield prisma.expense.delete({
            where: { expenseId: String(expenseId) },
        });
        res.json({ message: "Expense deleted successfully" });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Expense not found" });
        }
        console.error("Error deleting expense:", error);
        res.status(500).json({ message: "Error deleting expense" });
    }
});
