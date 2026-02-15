import { Router } from "express";
import { getCustomers, getCustomerById, createCustomer, updateCustomer, deleteCustomer, } from "../controllers/customerController";
const router = Router();
router.get("/", getCustomers);
router.get("/:customerId", getCustomerById);
router.post("/", createCustomer);
router.put("/:customerId", updateCustomer);
router.delete("/:customerId", deleteCustomer);
export default router;
