import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma.js";
import { generateInvoicePdf, ShopDetails } from "../lib/generateInvoicePdf.js";
import { sendInvoiceEmail } from "../lib/sendEmail.js";
import { recalculateCustomerBalances } from "./customerController.js";

async function getUserShopDetails(
  userId?: string,
): Promise<ShopDetails | undefined> {
  if (!userId) return undefined;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      shopName: true,
      shopAddress: true,
      shopPincode: true,
      shopContact: true,
      shopGst: true,
    },
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
    const { billingId, customerId, totalAmount, pnfCharges, items } = req.body;

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

    // Validate all products exist and have sufficient stock
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.products.findMany({
      where: {
        productId: { in: productIds },
      },
    });

    if (products.length !== productIds.length) {
      return res
        .status(400)
        .json({ message: "One or more products not found" });
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

    const computedItemsTotal = items.reduce((sum: number, item: any) => {
      const gross = item.quantity * item.price;
      const discount = item.discount || 0;
      return sum + Math.max(0, gross - discount);
    }, 0);
    const computedTotalAmount =
      computedItemsTotal + (typeof pnfCharges === "number" ? pnfCharges : 0);

    if (Math.abs(computedTotalAmount - Number(totalAmount)) > 0.01) {
      return res.status(400).json({
        message:
          "Provided totalAmount does not match the computed total from items and charges",
      });
    }

    // Create billing with items, snapshot opening/closing balances, and update stock in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const customer = await (tx as any).customer.findUnique({
        where: { customerId: String(customerId) },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      const availableCredit = Math.max(0, customer.totalCredit || 0);
      const creditApplied = Math.min(availableCredit, computedTotalAmount);
      const outstandingIncrease = Math.max(0, computedTotalAmount - creditApplied);
      const openingBalance = Math.max(0, Number(customer.totalOutstanding || 0));
      const closingBalance = openingBalance + outstandingIncrease;

      // Create billing (billingId will be auto-generated if not provided)
      const billing = await tx.billing.create({
        data: {
          ...(billingId && { billingId }),
          customerId,
          totalAmount: computedTotalAmount,
          pnfCharges: pnfCharges || 0,
          openingBalance,
          closingBalance,
        },
      });

      await (tx as any).customer.update({
        where: { customerId: String(customerId) },
        data: {
          totalCredit: { decrement: creditApplied },
          totalOutstanding: { increment: outstandingIncrease },
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
        }),
      );

      // Return billing with items and customer
      return await tx.billing.findUnique({
        where: { billingId: billing.billingId },
        include: {
          customer: {
            select: {
              customerId: true,
              name: true,
              email: true,
              address: true,
              totalOutstanding: true,
              totalCredit: true,
            },
          } as any,
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
    if (error?.message === "Customer not found") {
      return res.status(404).json({ message: "Customer not found" });
    }
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
    const pdfBuffer = await generateInvoicePdf(billing as any, shop);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${billing.billingId}.pdf"`,
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
    const pdfBuffer = await generateInvoicePdf(billing as any, shop);

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

export const updateBilling = async (req: Request, res: Response) => {
  try {
    const billingId = String(req.params.billingId);
    const { totalAmount, pnfCharges, items } = req.body;

    if (!totalAmount || !items || !Array.isArray(items)) {
      return res.status(400).json({
        message: "totalAmount and items array are required",
      });
    }
    if (items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
    }

    const computedItemsTotal = items.reduce((sum: number, item: any) => {
      const gross = item.quantity * item.price;
      const discount = item.discount || 0;
      return sum + Math.max(0, gross - discount);
    }, 0);
    const computedTotalAmount =
      computedItemsTotal + (typeof pnfCharges === "number" ? pnfCharges : 0);

    if (Math.abs(computedTotalAmount - Number(totalAmount)) > 0.01) {
      return res.status(400).json({
        message:
          "Provided totalAmount does not match the computed total from items and charges",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.billing.findUnique({
        where: { billingId },
        include: {
          BillingItem: true,
        },
      });

      if (!existing) {
        throw new Error("BILLING_NOT_FOUND");
      }

      for (const line of existing.BillingItem) {
        await tx.products.update({
          where: { productId: line.productId },
          data: {
            stockQuantity: { increment: line.quantity },
          },
        });
      }

      await tx.billingItem.deleteMany({ where: { billingId } });

      const productIds = items.map((item: any) => item.productId);
      const products = await tx.products.findMany({
        where: { productId: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      for (const item of items) {
        const product = products.find((p) => p.productId === item.productId);
        if (!product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }
        if (product.stockQuantity < item.quantity) {
          throw new Error(
            `INSUFFICIENT_STOCK|${product.name}|${product.stockQuantity}|${item.quantity}`,
          );
        }
      }

      for (const item of items) {
        const gross = item.quantity * item.price;
        const discount = item.discount || 0;
        const subtotal = Math.max(0, gross - discount);

        await tx.products.update({
          where: { productId: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        await tx.billingItem.create({
          data: {
            billingItemId: randomUUID(),
            billingId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            discount,
            subtotal,
          },
        });
      }

      // Recompute this bill's balance snapshot so that the invoice PDF
      // reflects the edited total. Preserve the original openingBalance
      // (it's a historical fact: what the customer owed before this bill)
      // and the credit that was applied at creation time, so that only the
      // delta of totalAmount flows into closingBalance.
      const oldTotal = Number(existing.totalAmount || 0);
      const openingBalance = Math.max(0, Number(existing.openingBalance || 0));
      const oldClosingBalance = Math.max(
        0,
        Number(existing.closingBalance || 0),
      );
      const oldOutstandingIncrease = Math.max(
        0,
        oldClosingBalance - openingBalance,
      );
      const creditAppliedOnThisBill = Math.max(
        0,
        oldTotal - oldOutstandingIncrease,
      );
      const newOutstandingIncrease = Math.max(
        0,
        computedTotalAmount - creditAppliedOnThisBill,
      );
      const newClosingBalance = openingBalance + newOutstandingIncrease;

      await tx.billing.update({
        where: { billingId },
        data: {
          totalAmount: computedTotalAmount,
          pnfCharges: pnfCharges || 0,
          closingBalance: newClosingBalance,
        },
      });

      await recalculateCustomerBalances(tx, existing.customerId);

      return await tx.billing.findUnique({
        where: { billingId },
        include: {
          customer: {
            select: {
              customerId: true,
              name: true,
              email: true,
              address: true,
              totalOutstanding: true,
              totalCredit: true,
            },
          } as any,
          BillingItem: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    res.json(result);
  } catch (error: any) {
    if (error?.message === "BILLING_NOT_FOUND") {
      return res.status(404).json({ message: "Billing not found" });
    }
    if (error?.message === "PRODUCT_NOT_FOUND") {
      return res.status(400).json({ message: "One or more products not found" });
    }
    if (typeof error?.message === "string" && error.message.startsWith("INSUFFICIENT_STOCK|")) {
      const [, name, avail, req] = error.message.split("|");
      return res.status(400).json({
        message: `Insufficient stock for product ${name}. Available: ${avail}, Requested: ${req}`,
      });
    }
    console.error("Error updating billing:", error);
    res.status(500).json({ message: "Error updating billing" });
  }
};

export const deleteBilling = async (req: Request, res: Response) => {
  try {
    const billingId = String(req.params.billingId);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.billing.findUnique({
        where: { billingId },
        include: { BillingItem: true },
      });

      if (!existing) {
        throw new Error("BILLING_NOT_FOUND");
      }

      for (const line of existing.BillingItem) {
        await tx.products.update({
          where: { productId: line.productId },
          data: {
            stockQuantity: { increment: line.quantity },
          },
        });
      }

      await tx.billingItem.deleteMany({ where: { billingId } });
      await tx.billing.delete({ where: { billingId } });

      await recalculateCustomerBalances(tx, existing.customerId);
    });

    res.json({ message: "Bill deleted", billingId });
  } catch (error: any) {
    if (error?.message === "BILLING_NOT_FOUND") {
      return res.status(404).json({ message: "Billing not found" });
    }
    console.error("Error deleting billing:", error);
    res.status(500).json({ message: "Error deleting billing" });
  }
};
