import { Router } from "express";
import { login, register, getMe, updateMe, logout } from "../controllers/authController";
import { protect } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);

export default router;
