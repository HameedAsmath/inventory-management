import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const search = req.query.search?.toString();
    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: {
        name: "asc",
      },
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: "Error Retrieving Customers" });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { customerId: String(customerId) },
      include: {
        Billing: {
          include: {
            BillingItem: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            timestamp: "desc",
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: "Error Retrieving Customer" });
  }
};

export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId, name, email, address, phone } = req.body;

    if (!customerId || !name) {
      return res
        .status(400)
        .json({ message: "customerId and name are required" });
    }

    const customer = await prisma.customer.create({
      data: { customerId, name, email, address, phone },
    });
    res.status(201).json(customer);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ message: "Customer ID or email already exists" });
    }
    res.status(500).json({ message: "Error Creating Customer" });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { name, email, address, phone } = req.body;

    const customer = await prisma.customer.update({
      where: { customerId: String(customerId) },
      data: { name, email, address, phone },
    });
    res.json(customer);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Customer not found" });
    }
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Error Updating Customer" });
  }
};

export const deleteCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    // Check if customer has any bills
    const billingCount = await prisma.billing.count({
      where: { customerId: String(customerId) },
    });

    if (billingCount > 0) {
      return res.status(400).json({
        message: "Cannot delete customer with existing bills",
      });
    }

    await prisma.customer.delete({
      where: { customerId: String(customerId) },
    });
    res.json({ message: "Customer deleted successfully" });
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Customer not found" });
    }
    res.status(500).json({ message: "Error Deleting Customer" });
  }
};
