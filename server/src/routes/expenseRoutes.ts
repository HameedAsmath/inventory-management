import { Router } from "express";
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
} from "../controllers/expenseController.js";

const router = Router();

router.post("/", createExpense);
router.get("/", getExpenses);
router.get("/:expenseId", getExpenseById);
router.put("/:expenseId", updateExpense);
router.delete("/:expenseId", deleteExpense);

export default router;
