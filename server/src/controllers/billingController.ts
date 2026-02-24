import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { generateInvoicePdf, ShopDetails } from "../lib/generateInvoicePdf";
import { sendInvoiceEmail } from "../lib/sendEmail";

async function getUserShopDetails(userId?: string): Promise<ShopDetails | undefined> {
  if (!userId) return undefined;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { shopName: true, shopAddress: true, shopPincode: true, shopContact: true, shopGst: true },
  });
  if (!user) return undefined;
  return {
    name: user.shopName,
    address: user.shopAddress,
    pincode: user.shopPincode,
    contact: user.shopContact,
    gst: user.shopGst,
  };
}

export const createBilling = async (req: Request, res: Response) => {
  try {
    const { billingId, customerId, totalAmount, pnfCharges, paidAmount, paymentStatus, items } = req.body;

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
          pnfCharges: pnfCharges || 0,
          paidAmount: paidAmount ?? 0,
          paymentStatus: paymentStatus || "pending",
        },
      });

      // Create billing items and update product stock
      const billingItems = await Promise.all(
        items.map(async (item: any) => {
          const gross = item.quantity * item.price;
          const discount = item.discount || 0;
          const subtotal = Math.max(0, gross - discount);

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
              discount,
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

export const getBillingPdf = async (req: Request, res: Response) => {
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

    const shop = await getUserShopDetails(req.userId);
    const pdfBuffer = await generateInvoicePdf(billing, shop);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${billing.billingId}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ message: "Error generating PDF" });
  }
};

export const emailBillingInvoice = async (req: Request, res: Response) => {
  try {
    const { billingId } = req.params;
    const { email } = req.body;

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

    const recipientEmail = email || billing.customer.email;
    if (!recipientEmail) {
      return res.status(400).json({
        message: "No email provided and customer has no email on file",
      });
    }

    const shop = await getUserShopDetails(req.userId);
    const pdfBuffer = await generateInvoicePdf(billing, shop);

    await sendInvoiceEmail({
      to: recipientEmail,
      customerName: billing.customer.name,
      billingId: billing.billingId,
      totalAmount: billing.totalAmount,
      pdfBuffer,
    });

    res.json({ message: `Invoice emailed to ${recipientEmail}` });
  } catch (error: any) {
    console.error("Error emailing invoice:", error);
    res.status(500).json({
      message: error.message || "Error sending invoice email",
    });
  }
};

export const updateBillingPaymentStatus = async (
  req: Request,
  res: Response
) => {
  try {
    const { billingId } = req.params;
    const { paymentStatus } = req.body;

    if (!paymentStatus || !["pending", "success", "cancelled"].includes(paymentStatus)) {
      return res.status(400).json({
        message: "paymentStatus must be one of: pending, success, cancelled",
      });
    }

    const existing = await prisma.billing.findUnique({
      where: { billingId: String(billingId) },
    });

    if (!existing) {
      return res.status(404).json({ message: "Billing not found" });
    }

    const updateData: any = { paymentStatus };
    if (paymentStatus === "success") {
      updateData.paidAmount = existing.totalAmount;
    } else if (paymentStatus === "cancelled") {
      updateData.paidAmount = 0;
    }

    const billing = await prisma.billing.update({
      where: { billingId: String(billingId) },
      data: updateData,
      include: {
        customer: true,
        BillingItem: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json(billing);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Billing not found" });
    }
    console.error("Error updating billing payment status:", error);
    res.status(500).json({ message: "Error updating payment status" });
  }
};

export const updateBilling = async (req: Request, res: Response) => {
  try {
    const { billingId } = req.params;
    const { customerId, totalAmount, pnfCharges, paidAmount, paymentStatus, items } = req.body;

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

    // Get existing billing with items
    const existingBilling = await prisma.billing.findUnique({
      where: { billingId: String(billingId) },
      include: {
        BillingItem: true,
      },
    });

    if (!existingBilling) {
      return res.status(404).json({ message: "Billing not found" });
    }

    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { customerId: String(customerId) },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Validate all products exist
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.products.findMany({
      where: {
        productId: { in: productIds },
      },
    });

    if (products.length !== productIds.length) {
      return res.status(400).json({ message: "One or more products not found" });
    }

    // Update billing with items and manage stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Restore stock for all existing items first
      for (const existingItem of existingBilling.BillingItem) {
        await tx.products.update({
          where: { productId: existingItem.productId },
          data: {
            stockQuantity: {
              increment: existingItem.quantity,
            },
          },
        });
      }

      // Delete all existing billing items
      await tx.billingItem.deleteMany({
        where: { billingId: existingBilling.billingId },
      });

      // Check stock availability for new items
      for (const item of items) {
        const product = products.find((p) => p.productId === item.productId);
        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if (product.stockQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`
          );
        }
      }

      // Create new billing items and update product stock
      const billingItems = await Promise.all(
        items.map(async (item: any) => {
          const gross = item.quantity * item.price;
          const discount = item.discount || 0;
          const subtotal = Math.max(0, gross - discount);

          // Update product stock
          await tx.products.update({
            where: { productId: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          });

          // Create billing item
          return await tx.billingItem.create({
            data: {
              billingItemId: randomUUID(),
              billingId: existingBilling.billingId,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              discount,
              subtotal,
            },
            include: {
              product: true,
            },
          });
        })
      );

      // Update billing
      const updatedBilling = await tx.billing.update({
        where: { billingId: existingBilling.billingId },
        data: {
          customerId,
          totalAmount,
          pnfCharges: pnfCharges ?? 0,
          paidAmount: paidAmount ?? 0,
          paymentStatus: paymentStatus || "pending",
        },
        include: {
          customer: true,
          BillingItem: {
            include: {
              product: true,
            },
          },
        },
      });

      return updatedBilling;
    });

    res.json(result);
  } catch (error: any) {
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Billing not found" });
    }
    console.error("Error updating billing:", error);
    res.status(500).json({
      message: error.message || "Error updating billing",
    });
  }
};
