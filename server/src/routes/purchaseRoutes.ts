import { Router } from "express";
import {
  createPurchase,
  deletePurchase,
  getPurchaseAnalytics,
  getPurchaseById,
  getPurchases,
  updatePurchase,
} from "../controllers/purchaseController.js";

const router = Router();

router.get("/", getPurchases);
router.get("/analytics", getPurchaseAnalytics);
router.post("/", createPurchase);
router.get("/:purchaseId", getPurchaseById);
router.put("/:purchaseId", updatePurchase);
router.delete("/:purchaseId", deletePurchase);

export default router;
