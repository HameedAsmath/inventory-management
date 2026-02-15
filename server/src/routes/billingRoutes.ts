import { Router } from "express";
import {
  createBilling,
  getBillings,
  getBillingById,
} from "../controllers/billingController";

const router = Router();

router.post("/", createBilling);
router.get("/", getBillings);
router.get("/:billingId", getBillingById);

export default router;
