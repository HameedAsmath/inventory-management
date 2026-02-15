var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { prisma } from "../lib/prisma";
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
            orderBy: {
                name: "asc",
            },
        });
        res.json(customers);
    }
    catch (error) {
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
        const { customerId, name, email, address, phone } = req.body;
        if (!customerId || !name) {
            return res
                .status(400)
                .json({ message: "customerId and name are required" });
        }
        const customer = yield prisma.customer.create({
            data: { customerId, name, email, address, phone },
        });
        res.status(201).json(customer);
    }
    catch (error) {
        if (error.code === "P2002") {
            return res
                .status(400)
                .json({ message: "Customer ID or email already exists" });
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
