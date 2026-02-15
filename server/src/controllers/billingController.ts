import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";

export const createBilling = async (req: Request, res: Response) => {
  try {
    const { billingId, customerId, totalAmount, items } = req.body;

    if (!customerId || !totalAmount || !items || !Array.isArray(items)) {
      return res.status(400).json({
        message: "customerId, totalAmount, and items array are required",
      });
    }

    if (items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
    }

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { customerId: String(customerId) },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Validate all products exist and have sufficient stock
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.products.findMany({
      where: {
        productId: { in: productIds },
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: "One or more products not found" });
    }

    // Check stock availability
    for (const item of items) {
      const product = products.find((p) => p.productId === item.productId);
      if (!product) {
        return res.status(400).json({
          message: `Product ${item.productId} not found`,
        });
      }
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
        });
      }
    }

    // Create billing with items and update stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create billing (billingId will be auto-generated if not provided)
      const billing = await tx.billing.create({
        data: {
          ...(billingId && { billingId }),
          customerId,
          totalAmount,
        },
      });

      // Create billing items and update product stock
      const billingItems = await Promise.all(
        items.map(async (item: any) => {
          const subtotal = item.quantity * item.price;

          // Update product stock
          await tx.products.update({
            where: { productId: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });

          // Create billing item with explicit billingItemId
          return await tx.billingItem.create({
            data: {
              billingItemId: randomUUID(),
              billingId: billing.billingId,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              subtotal,
            },
            include: {
              product: true,
            },
          });
        })
      );

      // Return billing with items and customer
      return await tx.billing.findUnique({
        where: { billingId: billing.billingId },
        include: {
          customer: true,
          BillingItem: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Billing ID already exists" });
    }
    console.error("Error creating billing:", error);
    res.status(500).json({ message: "Error Creating Billing" });
  }
};

export const getBillings = async (req: Request, res: Response) => {
  try {
    const billings = await prisma.billing.findMany({
      include: {
        customer: true,
        BillingItem: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });
    res.json(billings);
  } catch (error) {
    res.status(500).json({ message: "Error Retrieving Billings" });
  }
};

export const getBillingById = async (req: Request, res: Response) => {
  try {
    const { billingId } = req.params;
    const billing = await prisma.billing.findUnique({
      where: { billingId: String(billingId) },
      include: {
        customer: true,
        BillingItem: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!billing) {
      return res.status(404).json({ message: "Billing not found" });
    }

    res.json(billing);
  } catch (error) {
    res.status(500).json({ message: "Error Retrieving Billing" });
  }
};
