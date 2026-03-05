import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    });

    const token = generateToken(user.id);
    res.cookie("token", token, COOKIE_OPTIONS);

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user.id);
    res.cookie("token", token, COOKIE_OPTIONS);

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    const {
      name,
      shopName,
      shopAddress,
      shopPincode,
      shopContact,
      shopEmail,
      shopGst,
    } = req.body;

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(shopName !== undefined && { shopName }),
        ...(shopAddress !== undefined && { shopAddress }),
        ...(shopPincode !== undefined && { shopPincode }),
        ...(shopContact !== undefined && { shopContact }),
        ...(shopEmail !== undefined && { shopEmail }),
        ...(shopGst !== undefined && { shopGst }),
      },
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
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  });
  res.json({ message: "Logged out successfully" });
};
