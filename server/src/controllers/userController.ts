import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.users.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error Retrieving Users" });
  }
};
