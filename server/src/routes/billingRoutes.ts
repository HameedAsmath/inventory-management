import { Router } from "express";
import {
  createBilling,
  deleteBilling,
  getBillings,
  getBillingById,
  getBillingPdf,
  emailBillingInvoice,
  updateBilling,
} from "../controllers/billingController.js";

const router = Router();

router.post("/", createBilling);
router.get("/", getBillings);
router.get("/:billingId/pdf", getBillingPdf);
router.post("/:billingId/email", emailBillingInvoice);
router.put("/:billingId", updateBilling);
router.delete("/:billingId", deleteBilling);
router.get("/:billingId", getBillingById);

export default router;
