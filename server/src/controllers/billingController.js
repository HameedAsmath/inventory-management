var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma";
import { generateInvoicePdf } from "../lib/generateInvoicePdf";
import { sendInvoiceEmail } from "../lib/sendEmail";
function getUserShopDetails(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!userId)
            return undefined;
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: { shopName: true, shopAddress: true, shopPincode: true, shopContact: true, shopGst: true },
        });
        if (!user)
            return undefined;
        return {
            name: user.shopName,
            address: user.shopAddress,
            pincode: user.shopPincode,
            contact: user.shopContact,
            gst: user.shopGst,
        };
    });
}
export const createBilling = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const customer = yield prisma.customer.findUnique({
            where: { customerId: String(customerId) },
        });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        // Validate all products exist and have sufficient stock
        const productIds = items.map((item) => item.productId);
        const products = yield prisma.products.findMany({
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
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create billing (billingId will be auto-generated if not provided)
            const billing = yield tx.billing.create({
                data: Object.assign(Object.assign({}, (billingId && { billingId })), { customerId,
                    totalAmount, pnfCharges: pnfCharges || 0, paidAmount: paidAmount !== null && paidAmount !== void 0 ? paidAmount : 0, paymentStatus: paymentStatus || "pending" }),
            });
            // Create billing items and update product stock
            const billingItems = yield Promise.all(items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                const gross = item.quantity * item.price;
                const discount = item.discount || 0;
                const subtotal = Math.max(0, gross - discount);
                // Update product stock
                yield tx.products.update({
                    where: { productId: item.productId },
                    data: {
                        stockQuantity: {
                            decrement: item.quantity,
                        },
                    },
                });
                // Create billing item with explicit billingItemId
                return yield tx.billingItem.create({
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
            })));
            // Return billing with items and customer
            return yield tx.billing.findUnique({
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
        }));
        res.status(201).json(result);
    }
    catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ message: "Billing ID already exists" });
        }
        console.error("Error creating billing:", error);
        res.status(500).json({ message: "Error Creating Billing" });
    }
});
export const getBillings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const billings = yield prisma.billing.findMany({
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
    }
    catch (error) {
        res.status(500).json({ message: "Error Retrieving Billings" });
    }
});
export const getBillingById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { billingId } = req.params;
        const billing = yield prisma.billing.findUnique({
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
    }
    catch (error) {
        res.status(500).json({ message: "Error Retrieving Billing" });
    }
});
export const getBillingPdf = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { billingId } = req.params;
        const billing = yield prisma.billing.findUnique({
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
        const shop = yield getUserShopDetails(req.userId);
        const pdfBuffer = yield generateInvoicePdf(billing, shop);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${billing.billingId}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ message: "Error generating PDF" });
    }
});
export const emailBillingInvoice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { billingId } = req.params;
        const { email } = req.body;
        const billing = yield prisma.billing.findUnique({
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
        const shop = yield getUserShopDetails(req.userId);
        const pdfBuffer = yield generateInvoicePdf(billing, shop);
        yield sendInvoiceEmail({
            to: recipientEmail,
            customerName: billing.customer.name,
            billingId: billing.billingId,
            totalAmount: billing.totalAmount,
            pdfBuffer,
        });
        res.json({ message: `Invoice emailed to ${recipientEmail}` });
    }
    catch (error) {
        console.error("Error emailing invoice:", error);
        res.status(500).json({
            message: error.message || "Error sending invoice email",
        });
    }
});
export const updateBillingPaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { billingId } = req.params;
        const { paymentStatus } = req.body;
        if (!paymentStatus || !["pending", "success", "cancelled"].includes(paymentStatus)) {
            return res.status(400).json({
                message: "paymentStatus must be one of: pending, success, cancelled",
            });
        }
        const existing = yield prisma.billing.findUnique({
            where: { billingId: String(billingId) },
        });
        if (!existing) {
            return res.status(404).json({ message: "Billing not found" });
        }
        const updateData = { paymentStatus };
        if (paymentStatus === "success") {
            updateData.paidAmount = existing.totalAmount;
        }
        else if (paymentStatus === "cancelled") {
            updateData.paidAmount = 0;
        }
        const billing = yield prisma.billing.update({
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
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Billing not found" });
        }
        console.error("Error updating billing payment status:", error);
        res.status(500).json({ message: "Error updating payment status" });
    }
});
export const updateBilling = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const existingBilling = yield prisma.billing.findUnique({
            where: { billingId: String(billingId) },
            include: {
                BillingItem: true,
            },
        });
        if (!existingBilling) {
            return res.status(404).json({ message: "Billing not found" });
        }
        // Validate customer exists
        const customer = yield prisma.customer.findUnique({
            where: { customerId: String(customerId) },
        });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        // Validate all products exist
        const productIds = items.map((item) => item.productId);
        const products = yield prisma.products.findMany({
            where: {
                productId: { in: productIds },
            },
        });
        if (products.length !== productIds.length) {
            return res.status(400).json({ message: "One or more products not found" });
        }
        // Update billing with items and manage stock in a transaction
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Restore stock for all existing items first
            for (const existingItem of existingBilling.BillingItem) {
                yield tx.products.update({
                    where: { productId: existingItem.productId },
                    data: {
                        stockQuantity: {
                            increment: existingItem.quantity,
                        },
                    },
                });
            }
            // Delete all existing billing items
            yield tx.billingItem.deleteMany({
                where: { billingId: existingBilling.billingId },
            });
            // Check stock availability for new items
            for (const item of items) {
                const product = products.find((p) => p.productId === item.productId);
                if (!product) {
                    throw new Error(`Product ${item.productId} not found`);
                }
                if (product.stockQuantity < item.quantity) {
                    throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`);
                }
            }
            // Create new billing items and update product stock
            const billingItems = yield Promise.all(items.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                const gross = item.quantity * item.price;
                const discount = item.discount || 0;
                const subtotal = Math.max(0, gross - discount);
                // Update product stock
                yield tx.products.update({
                    where: { productId: item.productId },
                    data: {
                        stockQuantity: {
                            decrement: item.quantity,
                        },
                    },
                });
                // Create billing item
                return yield tx.billingItem.create({
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
            })));
            // Update billing
            const updatedBilling = yield tx.billing.update({
                where: { billingId: existingBilling.billingId },
                data: {
                    customerId,
                    totalAmount,
                    pnfCharges: pnfCharges !== null && pnfCharges !== void 0 ? pnfCharges : 0,
                    paidAmount: paidAmount !== null && paidAmount !== void 0 ? paidAmount : 0,
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
        }));
        res.json(result);
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Billing not found" });
        }
        console.error("Error updating billing:", error);
        res.status(500).json({
            message: error.message || "Error updating billing",
        });
    }
});
