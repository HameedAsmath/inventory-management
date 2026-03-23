import { Router } from "express";
import {
  createSupplier,
  deleteSupplier,
  getSupplierById,
  getSuppliers,
  updateSupplier,
} from "../controllers/supplierController.js";

const router = Router();

router.get("/", getSuppliers);
router.get("/:supplierId", getSupplierById);
router.post("/", createSupplier);
router.put("/:supplierId", updateSupplier);
router.delete("/:supplierId", deleteSupplier);

export default router;
