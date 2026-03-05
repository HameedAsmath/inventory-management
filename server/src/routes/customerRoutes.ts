import { Router } from "express";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStatementPdf,
  emailCustomerStatement,
} from "../controllers/customerController.js";

const router = Router();

router.get("/", getCustomers);
router.get("/:customerId/statement/pdf", getCustomerStatementPdf);
router.post("/:customerId/statement/email", emailCustomerStatement);
router.get("/:customerId", getCustomerById);
router.post("/", createCustomer);
router.put("/:customerId", updateCustomer);
router.delete("/:customerId", deleteCustomer);

export default router;
