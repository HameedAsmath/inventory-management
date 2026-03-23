import { Router } from "express";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  recordCustomerPayment,
  updateCustomerPayment,
  deleteCustomerPayment,
  getCustomerLedger,
  getCustomerStatementPdf,
  emailCustomerStatement,
} from "../controllers/customerController.js";

const router = Router();

router.get("/", getCustomers);
router.get("/:customerId/ledger", getCustomerLedger);
router.post("/:customerId/pay", recordCustomerPayment);
router.patch("/:customerId/payments/:paymentId", updateCustomerPayment);
router.delete("/:customerId/payments/:paymentId", deleteCustomerPayment);
router.get("/:customerId/statement/pdf", getCustomerStatementPdf);
router.post("/:customerId/statement/email", emailCustomerStatement);
router.get("/:customerId", getCustomerById);
router.post("/", createCustomer);
router.put("/:customerId", updateCustomer);
router.delete("/:customerId", deleteCustomer);

export default router;
