var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { prisma } from "../lib/prisma";
import { generateStatementPdf } from "../lib/generateStatementPdf";
import { sendStatementEmail } from "../lib/sendEmail";
export const getCustomers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const search = (_a = req.query.search) === null || _a === void 0 ? void 0 : _a.toString();
        const customers = yield prisma.customer.findMany({
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
            const { Billing: _ } = c, customer = __rest(c, ["Billing"]);
            return Object.assign(Object.assign({}, customer), { totalBilled, totalPaid, balance: totalBilled - totalPaid });
        });
        res.json(result);
    }
    catch (error) {
        console.error("Error Retrieving Customers:", (error === null || error === void 0 ? void 0 : error.message) || error);
        res.status(500).json({ message: "Error Retrieving Customers" });
    }
});
export const getCustomerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        const customer = yield prisma.customer.findUnique({
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
    }
    catch (error) {
        res.status(500).json({ message: "Error Retrieving Customer" });
    }
});
export const createCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, address, phone } = req.body;
        const customer = yield prisma.customer.create({
            data: { name, email, address, phone },
        });
        res.status(201).json(customer);
    }
    catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: "Error Creating Customer" });
    }
});
export const updateCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        const { name, email, address, phone } = req.body;
        const customer = yield prisma.customer.update({
            where: { customerId: String(customerId) },
            data: { name, email, address, phone },
        });
        res.json(customer);
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Customer not found" });
        }
        if (error.code === "P2002") {
            return res.status(400).json({ message: "Email already exists" });
        }
        res.status(500).json({ message: "Error Updating Customer" });
    }
});
export const deleteCustomer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        // Check if customer has any bills
        const billingCount = yield prisma.billing.count({
            where: { customerId: String(customerId) },
        });
        if (billingCount > 0) {
            return res.status(400).json({
                message: "Cannot delete customer with existing bills",
            });
        }
        yield prisma.customer.delete({
            where: { customerId: String(customerId) },
        });
        res.json({ message: "Customer deleted successfully" });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Customer not found" });
        }
        res.status(500).json({ message: "Error Deleting Customer" });
    }
});
function buildBillingWhere(customerId, query) {
    const where = { customerId: String(customerId) };
    if (query.status && query.status !== "all") {
        where.paymentStatus = query.status;
    }
    if (query.from || query.to) {
        where.timestamp = {};
        if (query.from)
            where.timestamp.gte = new Date(query.from);
        if (query.to) {
            const toEnd = new Date(query.to);
            toEnd.setHours(23, 59, 59, 999);
            where.timestamp.lte = toEnd;
        }
    }
    return where;
}
export const getCustomerStatementPdf = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const customerId = String(req.params.customerId);
        const customer = yield prisma.customer.findUnique({
            where: { customerId },
        });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        const q = {
            status: (_a = req.query.status) === null || _a === void 0 ? void 0 : _a.toString(),
            from: (_b = req.query.from) === null || _b === void 0 ? void 0 : _b.toString(),
            to: (_c = req.query.to) === null || _c === void 0 ? void 0 : _c.toString(),
        };
        const where = buildBillingWhere(customerId, q);
        const bills = yield prisma.billing.findMany({
            where,
            orderBy: { timestamp: "desc" },
        });
        const totalAmount = bills.reduce((s, b) => s + b.totalAmount, 0);
        const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);
        const pdfBuffer = yield generateStatementPdf({
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
        res.setHeader("Content-Disposition", `inline; filename="statement-${customer.name.replace(/\s+/g, "_")}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error generating statement PDF:", error);
        res.status(500).json({ message: "Error generating statement PDF" });
    }
});
export const emailCustomerStatement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customerId = String(req.params.customerId);
        const { email, status, from, to } = req.body;
        const customer = yield prisma.customer.findUnique({
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
        const bills = yield prisma.billing.findMany({
            where,
            orderBy: { timestamp: "desc" },
        });
        const totalAmount = bills.reduce((s, b) => s + b.totalAmount, 0);
        const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);
        const pdfBuffer = yield generateStatementPdf({
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
        yield sendStatementEmail({
            to: recipientEmail,
            customerName: customer.name,
            totalAmount,
            totalPaid,
            outstanding: totalAmount - totalPaid,
            billCount: bills.length,
            pdfBuffer,
        });
        res.json({ message: `Statement emailed to ${recipientEmail}` });
    }
    catch (error) {
        console.error("Error emailing statement:", error);
        res.status(500).json({
            message: error.message || "Error sending statement email",
        });
    }
});
