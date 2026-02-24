import { Router } from "express";
import { createProduct, getProducts, updateProduct } from "../controllers/productController";

const router = Router();

router.get("/", getProducts);
router.post("/", createProduct);
router.put("/:productId", updateProduct);
export default router;
