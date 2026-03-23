import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const search = req.query.search?.toString().trim();
    const suppliers = await prisma.supplier.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { name: "asc" },
    });
    res.json(suppliers);
  } catch (error) {
    console.error("Error retrieving suppliers:", error);
    res.status(500).json({ message: "Error retrieving suppliers" });
  }
};

export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const supplierId = String(req.params.supplierId);
    const supplier = await prisma.supplier.findUnique({
      where: { supplierId },
    });
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.json(supplier);
  } catch (error) {
    console.error("Error retrieving supplier:", error);
    res.status(500).json({ message: "Error retrieving supplier" });
  }
};

export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, phone, address } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
      },
    });
    res.status(201).json(supplier);
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ message: "Error creating supplier" });
  }
};

export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const supplierId = String(req.params.supplierId);
    const { name, phone, address } = req.body;

    const supplier = await prisma.supplier.update({
      where: { supplierId },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(phone !== undefined ? { phone: phone ? String(phone).trim() : null } : {}),
        ...(address !== undefined
          ? { address: address ? String(address).trim() : null }
          : {}),
      },
    });
    res.json(supplier);
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Supplier not found" });
    }
    console.error("Error updating supplier:", error);
    res.status(500).json({ message: "Error updating supplier" });
  }
};

export const deleteSupplier = async (req: Request, res: Response) => {
  try {
    const supplierId = String(req.params.supplierId);
    const purchaseCount = await prisma.purchase.count({ where: { supplierId } });
    if (purchaseCount > 0) {
      return res.status(400).json({
        message: "Cannot delete supplier with existing purchases",
      });
    }

    await prisma.supplier.delete({ where: { supplierId } });
    res.json({ message: "Supplier deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Supplier not found" });
    }
    console.error("Error deleting supplier:", error);
    res.status(500).json({ message: "Error deleting supplier" });
  }
};
