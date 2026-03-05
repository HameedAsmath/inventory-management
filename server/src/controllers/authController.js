var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
export const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
export const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        const existing = yield prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ message: "User already exists with this email" });
        }
        const hashed = yield bcrypt.hash(password, 10);
        const user = yield prisma.user.create({
            data: { name, email, password: hashed },
        });
        const token = generateToken(user.id);
        res.cookie("token", token, COOKIE_OPTIONS);
        res.json({
            user: { id: user.id, name: user.name, email: user.email },
        });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
export const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const user = yield prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const match = yield bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const token = generateToken(user.id);
        res.cookie("token", token, COOKIE_OPTIONS);
        res.json({
            user: { id: user.id, name: user.name, email: user.email },
        });
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
export const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                shopName: true,
                shopAddress: true,
                shopPincode: true,
                shopContact: true,
                shopEmail: true,
                shopGst: true,
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
export const updateMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, shopName, shopAddress, shopPincode, shopContact, shopEmail, shopGst } = req.body;
        const user = yield prisma.user.update({
            where: { id: req.userId },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name !== undefined && { name })), (shopName !== undefined && { shopName })), (shopAddress !== undefined && { shopAddress })), (shopPincode !== undefined && { shopPincode })), (shopContact !== undefined && { shopContact })), (shopEmail !== undefined && { shopEmail })), (shopGst !== undefined && { shopGst })),
            select: {
                id: true,
                name: true,
                email: true,
                shopName: true,
                shopAddress: true,
                shopPincode: true,
                shopContact: true,
                shopEmail: true,
                shopGst: true,
            },
        });
        res.json(user);
    }
    catch (err) {
        res.status(500).json({ message: err.message });
    }
});
export const logout = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });
    res.json({ message: "Logged out successfully" });
});
