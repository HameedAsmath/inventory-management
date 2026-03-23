import { Router } from "express";
import {
  createPurchase,
  getPurchaseAnalytics,
  getPurchaseById,
  getPurchases,
} from "../controllers/purchaseController.js";

const router = Router();

router.get("/", getPurchases);
router.get("/analytics", getPurchaseAnalytics);
router.get("/:purchaseId", getPurchaseById);
router.post("/", createPurchase);

export default router;
