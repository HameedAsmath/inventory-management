import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { generateStatementPdf } from "../lib/generateStatementPdf.js";
import type { ShopDetails } from "../lib/generateInvoicePdf.js";
import { sendSupplierStatementEmail } from "../lib/sendEmail.js";

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

export async function recalculateSupplierBalances(
  tx: any,
  supplierId: string,
) {
  const supplier = await tx.supplier.findUnique({
    where: { supplierId },
    select: { openingOutstanding: true },
  });
  const openingOutstanding = Math.max(0, supplier?.openingOutstanding ?? 0);

  const purchasedAgg = await tx.purchase.aggregate({
    where: { supplierId },
    _sum: { totalAmount: true },
  });
  const paidAgg = await tx.supplierPayment.aggregate({
    where: { supplierId },
    _sum: { amount: true },
  });

  const totalPurchased =
    openingOutstanding + (purchasedAgg?._sum?.totalAmount ?? 0);
  const totalPaid = paidAgg?._sum?.amount ?? 0;
  const totalOutstanding = Math.max(0, totalPurchased - totalPaid);
  const totalCredit = Math.max(0, totalPaid - totalPurchased);

  return await tx.supplier.update({
    where: { supplierId },
    data: { totalOutstanding, totalCredit },
  });
}

function parseOpeningOutstanding(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function buildPurchaseWhere(
  supplierId: string,
  query: Record<string, string | undefined>,
) {
  const where: any = { supplierId: String(supplierId) };
  if (query.from || query.to) {
    where.purchaseDate = {};
    if (query.from) where.purchaseDate.gte = new Date(query.from);
    if (query.to) {
      const toEnd = new Date(query.to);
      toEnd.setHours(23, 59, 59, 999);
      where.purchaseDate.lte = toEnd;
    }
  }
  return where;
}

export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const search = req.query.search?.toString().trim();
    const suppliers = await db.supplier.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        purchases: { select: { totalAmount: true } },
        payments: { select: { amount: true } },
      },
      orderBy: { name: "asc" },
    });

    const result = suppliers.map((s: any) => {
      const purchasedFromPurchases = s.purchases.reduce(
        (sum: number, p: any) => sum + p.totalAmount,
        0,
      );
      const opening = Math.max(0, s.openingOutstanding ?? 0);
      const totalPurchased = opening + purchasedFromPurchases;
      const totalPaid = s.payments.reduce(
        (sum: number, p: any) => sum + p.amount,
        0,
      );
      const { purchases: _p, payments: _pay, ...rest } = s;
      return {
        ...rest,
        totalPurchased,
        totalPaid,
        balance: s.totalOutstanding,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Error retrieving suppliers:", error);
    res.status(500).json({ message: "Error retrieving suppliers" });
  }
};

export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const supplierId = String(req.params.supplierId);
    const supplier = await db.supplier.findUnique({
      where: { supplierId },
      include: {
        purchases: {
          include: {
            purchaseItems: { include: { product: true } },
          },
          orderBy: { purchaseDate: "desc" },
        },
        payments: {
          orderBy: { timestamp: "desc" },
        },
      },
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

    const openingOutstanding = parseOpeningOutstanding(
      req.body.openingOutstanding,
    );
    if (openingOutstanding === null) {
      return res.status(400).json({
        message: "Opening outstanding must be a non-negative number",
      });
    }

    const supplier = await db.supplier.create({
      data: {
        name: String(name).trim(),
        phone: phone ? String(phone).trim() : null,
        address: address ? String(address).trim() : null,
        openingOutstanding,
        totalOutstanding: openingOutstanding,
        totalCredit: 0,
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

    const hasOpeningOutstanding = Object.prototype.hasOwnProperty.call(
      req.body,
      "openingOutstanding",
    );
    let openingOutstanding: number | null = null;
    if (hasOpeningOutstanding) {
      openingOutstanding = parseOpeningOutstanding(req.body.openingOutstanding);
      if (openingOutstanding === null) {
        return res.status(400).json({
          message: "Opening outstanding must be a non-negative number",
        });
      }
    }

    const supplier = await db.$transaction(async (tx: any) => {
      const existing = await tx.supplier.findUnique({
        where: { supplierId },
      });
      if (!existing) {
        throw Object.assign(new Error("Supplier not found"), { code: "P2025" });
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = String(name).trim();
      if (phone !== undefined)
        updateData.phone = phone ? String(phone).trim() : null;
      if (address !== undefined)
        updateData.address = address ? String(address).trim() : null;
      if (hasOpeningOutstanding) {
        updateData.openingOutstanding = openingOutstanding;
      }

      await tx.supplier.update({
        where: { supplierId },
        data: updateData,
      });

      if (
        hasOpeningOutstanding &&
        openingOutstanding !== existing.openingOutstanding
      ) {
        return await recalculateSupplierBalances(tx, supplierId);
      }

      return await tx.supplier.findUnique({ where: { supplierId } });
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
    const purchaseCount = await db.purchase.count({ where: { supplierId } });
    if (purchaseCount > 0) {
      return res.status(400).json({
        message: "Cannot delete supplier with existing purchases",
      });
    }
    const paymentCount = await db.supplierPayment.count({
      where: { supplierId },
    });
    if (paymentCount > 0) {
      return res.status(400).json({
        message: "Cannot delete supplier with existing payments",
      });
    }

    await db.supplier.delete({ where: { supplierId } });
    res.json({ message: "Supplier deleted successfully" });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return res.status(404).json({ message: "Supplier not found" });
    }
    console.error("Error deleting supplier:", error);
    res.status(500).json({ message: "Error deleting supplier" });
  }
};

export const recordSupplierPayment = async (req: Request, res: Response) => {
  try {
    const supplierId = String(req.params.supplierId);
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a positive number" });
    }

    const result = await db.$transaction(async (tx: any) => {
      const supplier = await tx.supplier.findUnique({ where: { supplierId } });
      if (!supplier) {
        throw new Error("Supplier not found");
      }

      const outstandingBefore = Math.max(0, supplier.totalOutstanding || 0);
      const amountToOutstanding = Math.min(outstandingBefore, amount);
      const extraToCredit = Math.max(0, amount - amountToOutstanding);

      const updatedSupplier = await tx.supplier.update({
        where: { supplierId },
        data: {
          totalOutstanding: { decrement: amountToOutstanding },
          totalCredit: { increment: extraToCredit },
        },
      });

      const paymentEntries: any[] = [];
      if (amountToOutstanding > 0) {
        paymentEntries.push(
          await tx.supplierPayment.create({
            data: {
              supplierId,
              amount: amountToOutstanding,
              type: "payment",
            },
          }),
        );
      }
      if (extraToCredit > 0 || outstandingBefore <= 0) {
        paymentEntries.push(
          await tx.supplierPayment.create({
            data: {
              supplierId,
              amount: extraToCredit > 0 ? extraToCredit : amount,
              type: "advance",
            },
          }),
        );
      }

      return { supplier: updatedSupplier, entries: paymentEntries };
    });

    res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === "Supplier not found") {
      return res.status(404).json({ message: "Supplier not found" });
    }
    console.error("Error recording supplier payment:", error);
    res.status(500).json({ message: "Error recording payment" });
  }
};

export const updateSupplierPayment = async (req: Request, res: Response) => {
  try {
    const supplierId = String(req.params.supplierId);
    const paymentId = String(req.params.paymentId);
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a positive number" });
    }

    const result = await db.$transaction(async (tx: any) => {
      const payment = await tx.supplierPayment.findUnique({
        where: { paymentId },
      });
      if (!payment || payment.supplierId !== supplierId) {
        throw new Error("Payment not found");
      }

      const updatedPayment = await tx.supplierPayment.update({
        where: { paymentId },
        data: { amount },
      });
      const updatedSupplier = await recalculateSupplierBalances(
        tx,
        supplierId,
      );

      return { payment: updatedPayment, supplier: updatedSupplier };
    });

    res.json(result);
  } catch (error: any) {
    if (error?.message === "Payment not found") {
      return res.status(404).json({ message: "Payment not found" });
    }
    console.error("Error updating supplier payment:", error);
    res.status(500).json({ message: "Error updating supplier payment" });
  }
};

export const deleteSupplierPayment = async (req: Request, res: Response) => {
  try {
    const supplierId = String(req.params.supplierId);
    const paymentId = String(req.params.paymentId);

    const result = await db.$transaction(async (tx: any) => {
      const payment = await tx.supplierPayment.findUnique({
        where: { paymentId },
      });
      if (!payment || payment.supplierId !== supplierId) {
        throw new Error("Payment not found");
      }

      await tx.supplierPayment.delete({ where: { paymentId } });
      const updatedSupplier = await recalculateSupplierBalances(
        tx,
        supplierId,
      );
      return { supplier: updatedSupplier };
    });

    res.json({ message: "Payment deleted", ...result });
  } catch (error: any) {
    if (error?.message === "Payment not found") {
      return res.status(404).json({ message: "Payment not found" });
    }
    console.error("Error deleting supplier payment:", error);
    res.status(500).json({ message: "Error deleting supplier payment" });
  }
};

export const getSupplierLedger = async (req: Request, res: Response) => {
  try {
    const supplierId = String(req.params.supplierId);

    const supplier = await db.supplier.findUnique({
      where: { supplierId },
      include: {
        purchases: {
          include: {
            purchaseItems: { include: { product: true } },
          },
          orderBy: { purchaseDate: "desc" },
        },
        payments: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const q = {
      from: req.query.from?.toString(),
      to: req.query.to?.toString(),
    };
    const where = buildPurchaseWhere(supplierId, q);
    const filteredPurchases = await db.purchase.findMany({
      where,
      include: {
        purchaseItems: { include: { product: true } },
      },
      orderBy: { purchaseDate: "desc" },
    });

    res.json({
      supplier: {
        supplierId: supplier.supplierId,
        name: supplier.name,
        phone: supplier.phone,
        address: supplier.address,
        openingOutstanding: supplier.openingOutstanding,
      },
      purchases: filteredPurchases.length
        ? filteredPurchases
        : supplier.purchases,
      payments: supplier.payments,
      outstanding: supplier.totalOutstanding,
      credit: supplier.totalCredit,
      openingOutstanding: supplier.openingOutstanding,
    });
  } catch (error) {
    console.error("Error fetching supplier ledger:", error);
    res.status(500).json({ message: "Error fetching supplier ledger" });
  }
};

export const getSupplierStatementPdf = async (
  req: Request,
  res: Response,
) => {
  try {
    const supplierId = String(req.params.supplierId);
    const supplier = await db.supplier.findUnique({ where: { supplierId } });
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const q = {
      from: req.query.from?.toString(),
      to: req.query.to?.toString(),
    };
    const where = buildPurchaseWhere(supplierId, q);
    const purchases = await db.purchase.findMany({
      where,
      orderBy: { purchaseDate: "desc" },
    });

    const payments = await db.supplierPayment.findMany({
      where: {
        supplierId,
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

    const totalAmount = purchases.reduce(
      (s: number, p: any) => s + p.totalAmount,
      0,
    );
    const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);
    const openingBalance = Math.max(
      0,
      supplier.totalOutstanding - totalAmount,
    );
    const shop = await getUserShopDetails(req.userId);

    const pdfBuffer = await generateStatementPdf(
      {
        kind: "supplier",
        customer: {
          name: supplier.name,
          email: null,
          address: supplier.address,
        },
        bills: purchases.map((p: any) => ({
          billingId: p.purchaseId,
          totalAmount: p.totalAmount,
          timestamp: p.purchaseDate,
        })),
        payments: payments.map((p: any) => ({
          paymentId: p.paymentId,
          amount: p.amount,
          type: p.type,
          timestamp: p.timestamp,
        })),
        totalAmount,
        totalPaid,
        outstanding: supplier.totalOutstanding,
        credit: supplier.totalCredit,
        openingBalance,
        billAmount: totalAmount,
        currentBalance: supplier.totalOutstanding,
      },
      shop,
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="supplier-statement-${supplier.name.replace(/\s+/g, "_")}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating supplier statement PDF:", error);
    res
      .status(500)
      .json({ message: "Error generating supplier statement PDF" });
  }
};

export const emailSupplierStatement = async (req: Request, res: Response) => {
  try {
    const supplierId = String(req.params.supplierId);
    const { email, from, to } = req.body;

    const supplier = await db.supplier.findUnique({ where: { supplierId } });
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const recipientEmail = email;
    if (!recipientEmail) {
      return res.status(400).json({ message: "No email address provided" });
    }

    const where = buildPurchaseWhere(supplierId, { from, to });
    const purchases = await db.purchase.findMany({
      where,
      orderBy: { purchaseDate: "desc" },
    });

    const payments = await db.supplierPayment.findMany({
      where: {
        supplierId,
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

    const totalAmount = purchases.reduce(
      (s: number, p: any) => s + p.totalAmount,
      0,
    );
    const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);
    const openingBalance = Math.max(
      0,
      supplier.totalOutstanding - totalAmount,
    );
    const shop = await getUserShopDetails(req.userId);

    const pdfBuffer = await generateStatementPdf(
      {
        kind: "supplier",
        customer: {
          name: supplier.name,
          email: null,
          address: supplier.address,
        },
        bills: purchases.map((p: any) => ({
          billingId: p.purchaseId,
          totalAmount: p.totalAmount,
          timestamp: p.purchaseDate,
        })),
        payments: payments.map((p: any) => ({
          paymentId: p.paymentId,
          amount: p.amount,
          type: p.type,
          timestamp: p.timestamp,
        })),
        totalAmount,
        totalPaid,
        outstanding: supplier.totalOutstanding,
        credit: supplier.totalCredit,
        openingBalance,
        billAmount: totalAmount,
        currentBalance: supplier.totalOutstanding,
      },
      shop,
    );

    await sendSupplierStatementEmail({
      to: recipientEmail,
      supplierName: supplier.name,
      totalAmount,
      totalPaid,
      outstanding: supplier.totalOutstanding,
      purchaseCount: purchases.length,
      pdfBuffer,
    });

    res.json({ message: `Statement emailed to ${recipientEmail}` });
  } catch (error: any) {
    console.error("Error emailing supplier statement:", error);
    res.status(500).json({
      message: error.message || "Error sending supplier statement email",
    });
  }
};
