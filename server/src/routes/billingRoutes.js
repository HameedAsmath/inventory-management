import { Router } from "express";
import {
  createBilling,
  getBillings,
  getBillingById,
  getBillingPdf,
  emailBillingInvoice,
  updateBillingPaymentStatus,
  updateBilling,
} from "../controllers/billingController.js";
const router = Router();
router.post("/", createBilling);
router.get("/", getBillings);
router.get("/:billingId/pdf", getBillingPdf);
router.post("/:billingId/email", emailBillingInvoice);
router.patch("/:billingId/payment-status", updateBillingPaymentStatus);
router.put("/:billingId", updateBilling);
router.get("/:billingId", getBillingById);
export default router;
