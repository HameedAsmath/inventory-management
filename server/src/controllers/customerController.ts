import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { generateStatementPdf } from "../lib/generateStatementPdf.js";
import type { ShopDetails } from "../lib/generateInvoicePdf.js";
import { sendStatementEmail } from "../lib/sendEmail.js";

const db: any = prisma;

async function getUserShopDetails(
  userId?: string,
): Promise<ShopDetails | undefined> {
  if (!userId) return undefined;
  const user = await db.user.findUnique({
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

export async function recalculateCustomerBalances(tx: any, customerId: string) {
  const billedAgg = await tx.billing.aggregate({
    where: { customerId },
    _sum: { totalAmount: true },
  });
  const paidAgg = await tx.customerPayment.aggregate({
    where: { customerId },
    _sum: { amount: true },
  });

  const totalBilled = billedAgg?._sum?.totalAmount ?? 0;
  const totalPaid = paidAgg?._sum?.amount ?? 0;
  const totalOutstanding = Math.max(0, totalBilled - totalPaid);
  const totalCredit = Math.max(0, totalPaid - totalBilled);

  return await tx.customer.update({
    where: { customerId },
    data: { totalOutstanding, totalCredit },
  });
}

export const getCustomers = async (req: Request, res: Response) => {
  try {
    const search = req.query.search?.toString();
    const customers = await db.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        Billing: {
          select: { totalAmount: true },
        },
        payments: {
          select: { amount: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const result = customers.map((c: any) => {
      const totalBilled = c.Billing.reduce((s: number, b: any) => s + b.totalAmount, 0);
      const totalPaid = c.payments.reduce((s: number, p: any) => s + p.amount, 0);
      const { Billing: _, payments: __, ...customer } = c;
      return {
        ...customer,
        totalBilled,
        totalPaid,
        balance: c.totalOutstanding,
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error Retrieving Customers:", error?.message || error);
    res.status(500).json({ message: "Error Retrieving Customers" });
  }
};

export const getCustomerById = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const customer = await db.customer.findUnique({
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
        payments: {
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
    const { name, email, address, phone } = req.body;

    const customer = await db.customer.create({
      data: { name, email, address, phone },
    });
    res.status(201).json(customer);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email already exists" });
    }
    res.status(500).json({ message: "Error Creating Customer" });
  }
};

export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { name, email, address, phone } = req.body;

    const customer = await db.customer.update({
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
    const billingCount = await db.billing.count({
      where: { customerId: String(customerId) },
    });

    if (billingCount > 0) {
      return res.status(400).json({
        message: "Cannot delete customer with existing bills",
      });
    }

    await db.customer.delete({
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

function buildBillingWhere(customerId: string, query: Record<string, string | undefined>) {
  const where: any = { customerId: String(customerId) };
  if (query.from || query.to) {
    where.timestamp = {};
    if (query.from) where.timestamp.gte = new Date(query.from);
    if (query.to) {
      const toEnd = new Date(query.to);
      toEnd.setHours(23, 59, 59, 999);
      where.timestamp.lte = toEnd;
    }
  }
  return where;
}

export const recordCustomerPayment = async (req: Request, res: Response) => {
  try {
    const customerId = String(req.params.customerId);
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    const result = await db.$transaction(async (tx: any) => {
      const customer = await tx.customer.findUnique({
        where: { customerId },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      const outstandingBefore = Math.max(0, customer.totalOutstanding || 0);
      const amountToOutstanding = Math.min(outstandingBefore, amount);
      const extraToCredit = Math.max(0, amount - amountToOutstanding);

      const updatedCustomer = await tx.customer.update({
        where: { customerId },
        data: {
          totalOutstanding: { decrement: amountToOutstanding },
          totalCredit: { increment: extraToCredit },
        },
      });

      const paymentEntries: any[] = [];
      if (amountToOutstanding > 0) {
        paymentEntries.push(
          await tx.customerPayment.create({
            data: {
              customerId,
              amount: amountToOutstanding,
              type: "payment",
            },
          }),
        );
      }
      if (extraToCredit > 0 || outstandingBefore <= 0) {
        paymentEntries.push(
          await tx.customerPayment.create({
            data: {
              customerId,
              amount: extraToCredit > 0 ? extraToCredit : amount,
              type: "advance",
            },
          }),
        );
      }

      return {
        customer: updatedCustomer,
        entries: paymentEntries,
      };
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === "Customer not found") {
      return res.status(404).json({ message: "Customer not found" });
    }
    console.error("Error recording customer payment:", error);
    res.status(500).json({ message: "Error recording payment" });
  }
};

export const updateCustomerPayment = async (req: Request, res: Response) => {
  try {
    const customerId = String(req.params.customerId);
    const paymentId = String(req.params.paymentId);
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    const result = await db.$transaction(async (tx: any) => {
      const payment = await tx.customerPayment.findUnique({
        where: { paymentId },
      });
      if (!payment || payment.customerId !== customerId) {
        throw new Error("Payment not found");
      }

      const updatedPayment = await tx.customerPayment.update({
        where: { paymentId },
        data: { amount },
      });
      const updatedCustomer = await recalculateCustomerBalances(tx, customerId);

      return { payment: updatedPayment, customer: updatedCustomer };
    });

    res.json(result);
  } catch (error: any) {
    if (error?.message === "Payment not found") {
      return res.status(404).json({ message: "Payment not found" });
    }
    console.error("Error updating customer payment:", error);
    res.status(500).json({ message: "Error updating customer payment" });
  }
};

export const deleteCustomerPayment = async (req: Request, res: Response) => {
  try {
    const customerId = String(req.params.customerId);
    const paymentId = String(req.params.paymentId);

    const result = await db.$transaction(async (tx: any) => {
      const payment = await tx.customerPayment.findUnique({
        where: { paymentId },
      });
      if (!payment || payment.customerId !== customerId) {
        throw new Error("Payment not found");
      }

      await tx.customerPayment.delete({
        where: { paymentId },
      });
      const updatedCustomer = await recalculateCustomerBalances(tx, customerId);
      return { customer: updatedCustomer };
    });

    res.json({ message: "Payment deleted", ...result });
  } catch (error: any) {
    if (error?.message === "Payment not found") {
      return res.status(404).json({ message: "Payment not found" });
    }
    console.error("Error deleting customer payment:", error);
    res.status(500).json({ message: "Error deleting customer payment" });
  }
};

export const getCustomerLedger = async (req: Request, res: Response) => {
  try {
    const customerId = String(req.params.customerId);

    const customer = await db.customer.findUnique({
      where: { customerId },
      include: {
        Billing: {
          include: {
            BillingItem: {
              include: { product: true },
            },
          },
          orderBy: { timestamp: "desc" },
        },
        payments: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({
      customer: {
        customerId: customer.customerId,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      bills: customer.Billing,
      payments: customer.payments,
      outstanding: customer.totalOutstanding,
      credit: customer.totalCredit,
    });
  } catch (error: any) {
    console.error("Error fetching customer ledger:", error);
    res.status(500).json({ message: "Error fetching customer ledger" });
  }
};

export const getCustomerStatementPdf = async (req: Request, res: Response) => {
  try {
    const customerId = String(req.params.customerId);
    const customer = await db.customer.findUnique({
      where: { customerId },
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const q = {
      from: req.query.from?.toString(),
      to: req.query.to?.toString(),
    };
    const where = buildBillingWhere(customerId, q);
    const bills = await db.billing.findMany({
      where,
      orderBy: { timestamp: "desc" },
    });

    const payments = await db.customerPayment.findMany({
      where: {
        customerId,
        ...(q.from || q.to
          ? {
              timestamp: {
                ...(q.from ? { gte: new Date(q.from) } : {}),
                ...(q.to
                  ? {
                      lte: (() => {
                        const toEnd = new Date(q.to!);
                        toEnd.setHours(23, 59, 59, 999);
                        return toEnd;
                      })(),
                    }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: { timestamp: "desc" },
    });

    const totalAmount = bills.reduce((s: number, b: any) => s + b.totalAmount, 0);
    const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);

    const openingBalance = Math.max(0, customer.totalOutstanding - totalAmount);
    const shop = await getUserShopDetails(req.userId);

    const pdfBuffer = await generateStatementPdf({
      customer: {
        name: customer.name,
        email: customer.email,
        address: customer.address,
      },
      bills: bills.map((b: any) => ({
        billingId: b.billingId,
        totalAmount: b.totalAmount,
        timestamp: b.timestamp,
      })),
      payments: payments.map((p: any) => ({
        paymentId: p.paymentId,
        amount: p.amount,
        type: p.type,
        timestamp: p.timestamp,
      })),
      totalAmount,
      totalPaid,
      outstanding: customer.totalOutstanding,
      credit: customer.totalCredit,
      openingBalance,
      billAmount: totalAmount,
      currentBalance: customer.totalOutstanding,
    }, shop);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="statement-${customer.name.replace(/\s+/g, "_")}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating statement PDF:", error);
    res.status(500).json({ message: "Error generating statement PDF" });
  }
};

export const emailCustomerStatement = async (req: Request, res: Response) => {
  try {
    const customerId = String(req.params.customerId);
    const { email, from, to } = req.body;

    const customer = await db.customer.findUnique({
      where: { customerId },
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const recipientEmail = email || customer.email;
    if (!recipientEmail) {
      return res
        .status(400)
        .json({ message: "No email address provided or on file" });
    }

    const where = buildBillingWhere(customerId, { from, to });
    const bills = await db.billing.findMany({
      where,
      orderBy: { timestamp: "desc" },
    });

    const payments = await db.customerPayment.findMany({
      where: {
        customerId,
        ...(from || to
          ? {
              timestamp: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to
                  ? {
                      lte: (() => {
                        const toEnd = new Date(to);
                        toEnd.setHours(23, 59, 59, 999);
                        return toEnd;
                      })(),
                    }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: { timestamp: "desc" },
    });

    const totalAmount = bills.reduce((s: number, b: any) => s + b.totalAmount, 0);
    const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);

    const openingBalance = Math.max(0, customer.totalOutstanding - totalAmount);
    const shop = await getUserShopDetails(req.userId);

    const pdfBuffer = await generateStatementPdf({
      customer: {
        name: customer.name,
        email: customer.email,
        address: customer.address,
      },
      bills: bills.map((b: any) => ({
        billingId: b.billingId,
        totalAmount: b.totalAmount,
        timestamp: b.timestamp,
      })),
      payments: payments.map((p: any) => ({
        paymentId: p.paymentId,
        amount: p.amount,
        type: p.type,
        timestamp: p.timestamp,
      })),
      totalAmount,
      totalPaid,
      outstanding: customer.totalOutstanding,
      credit: customer.totalCredit,
      openingBalance,
      billAmount: totalAmount,
      currentBalance: customer.totalOutstanding,
    }, shop);

    await sendStatementEmail({
      to: recipientEmail,
      customerName: customer.name,
      totalAmount,
      totalPaid,
      outstanding: customer.totalOutstanding,
      billCount: bills.length,
      pdfBuffer,
    });

    res.json({ message: `Statement emailed to ${recipientEmail}` });
  } catch (error: any) {
    console.error("Error emailing statement:", error);
    res.status(500).json({
      message: error.message || "Error sending statement email",
    });
  }
};
