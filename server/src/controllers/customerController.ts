import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { generateStatementPdf } from "../lib/generateStatementPdf.js";
import { sendStatementEmail } from "../lib/sendEmail.js";

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
      include: {
        Billing: {
          where: { paymentStatus: { not: "cancelled" } },
          select: { totalAmount: true, paidAmount: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const result = customers.map((c) => {
      const totalBilled = c.Billing.reduce((s, b) => s + b.totalAmount, 0);
      const totalPaid = c.Billing.reduce((s, b) => s + b.paidAmount, 0);
      const { Billing: _, ...customer } = c;
      return {
        ...customer,
        totalBilled,
        totalPaid,
        balance: totalBilled - totalPaid,
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
    const { name, email, address, phone } = req.body;

    const customer = await prisma.customer.create({
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

function buildBillingWhere(
  customerId: string,
  query: Record<string, string | undefined>,
) {
  const where: any = { customerId: String(customerId) };
  if (query.status && query.status !== "all") {
    where.paymentStatus = query.status;
  }
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

export const getCustomerStatementPdf = async (req: Request, res: Response) => {
  try {
    const customerId = String(req.params.customerId);
    const customer = await prisma.customer.findUnique({
      where: { customerId },
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const q = {
      status: req.query.status?.toString(),
      from: req.query.from?.toString(),
      to: req.query.to?.toString(),
    };
    const where = buildBillingWhere(customerId, q);
    const bills = await prisma.billing.findMany({
      where,
      orderBy: { timestamp: "desc" },
    });

    const totalAmount = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);

    const pdfBuffer = await generateStatementPdf({
      customer: {
        name: customer.name,
        email: customer.email,
        address: customer.address,
      },
      bills: bills.map((b) => ({
        billingId: b.billingId,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        paymentStatus: b.paymentStatus,
        timestamp: b.timestamp,
      })),
      totalAmount,
      totalPaid,
      outstanding: totalAmount - totalPaid,
    });

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
    const { email, status, from, to } = req.body;

    const customer = await prisma.customer.findUnique({
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

    const where = buildBillingWhere(customerId, { status, from, to });
    const bills = await prisma.billing.findMany({
      where,
      orderBy: { timestamp: "desc" },
    });

    const totalAmount = bills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);

    const pdfBuffer = await generateStatementPdf({
      customer: {
        name: customer.name,
        email: customer.email,
        address: customer.address,
      },
      bills: bills.map((b) => ({
        billingId: b.billingId,
        totalAmount: b.totalAmount,
        paidAmount: b.paidAmount,
        paymentStatus: b.paymentStatus,
        timestamp: b.timestamp,
      })),
      totalAmount,
      totalPaid,
      outstanding: totalAmount - totalPaid,
    });

    await sendStatementEmail({
      to: recipientEmail,
      customerName: customer.name,
      totalAmount,
      totalPaid,
      outstanding: totalAmount - totalPaid,
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
