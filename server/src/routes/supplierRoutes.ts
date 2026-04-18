import { Router } from "express";
import {
  createSupplier,
  deleteSupplier,
  deleteSupplierPayment,
  getSupplierById,
  getSupplierLedger,
  getSuppliers,
  recordSupplierPayment,
  updateSupplier,
  updateSupplierPayment,
} from "../controllers/supplierController.js";

const router = Router();

router.get("/", getSuppliers);
router.get("/:supplierId/ledger", getSupplierLedger);
router.post("/:supplierId/pay", recordSupplierPayment);
router.patch("/:supplierId/payments/:paymentId", updateSupplierPayment);
router.delete("/:supplierId/payments/:paymentId", deleteSupplierPayment);
router.get("/:supplierId", getSupplierById);
router.post("/", createSupplier);
router.put("/:supplierId", updateSupplier);
router.delete("/:supplierId", deleteSupplier);

export default router;
