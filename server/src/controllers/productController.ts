import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getProducts = async (req: Request, res: Response) => {
  try {
    const search = req.query.search?.toString();
    const products = await prisma.products.findMany({
      where: {
        name: {
          contains: search,
        },
      },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error Retrieving Products" });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { productId, name, price, stockQuantity, rating } = req.body;
    const product = await prisma.products.create({
      data: { productId, name, price, stockQuantity, rating },
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: "Error Creating Product" });
  }
};
