import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

export const protect = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is missing in environment variables");
    }
    const decoded: any = jwt.verify(token, secret);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token expired" });
  }
};
