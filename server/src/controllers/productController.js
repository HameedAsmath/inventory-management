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
// Normalize category name: trim spaces, handle case sensitivity
const normalizeCategory = (category) => {
    if (!category || typeof category !== "string")
        return null;
    // Trim and normalize spaces (replace multiple spaces with single space)
    const normalized = category.trim().replace(/\s+/g, " ");
    return normalized.length > 0 ? normalized : null;
};
export const getProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const search = (_a = req.query.search) === null || _a === void 0 ? void 0 : _a.toString();
        const category = (_b = req.query.category) === null || _b === void 0 ? void 0 : _b.toString();
        const where = {};
        if (search) {
            where.name = {
                contains: search,
                mode: "insensitive",
            };
        }
        // Handle special filter cases
        if (category === "low-stock") {
            where.stockQuantity = {
                lt: 10,
                gt: 0,
            };
        }
        else if (category === "out-of-stock") {
            where.stockQuantity = 0;
        }
        else if (category && category !== "all") {
            // Filter by specific category - need to normalize and match
            const normalizedCategory = normalizeCategory(category);
            if (normalizedCategory) {
                // Get all products first to filter by normalized category
                const allProducts = yield prisma.products.findMany({
                    where: search
                        ? { name: { contains: search, mode: "insensitive" } }
                        : {},
                    orderBy: {
                        name: "asc",
                    },
                });
                // Filter by normalized category (case-insensitive, space-normalized)
                const filtered = allProducts.filter((p) => {
                    if (!p.category)
                        return false;
                    return normalizeCategory(p.category) === normalizedCategory;
                });
                return res.json(filtered);
            }
        }
        const products = yield prisma.products.findMany({
            where,
            orderBy: {
                name: "asc",
            },
        });
        res.json(products);
    }
    catch (error) {
        console.error("Error retrieving products:", error);
        res.status(500).json({ message: "Error Retrieving Products" });
    }
});
export const createProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId, name, price1, price2, cp, stockQuantity, category } = req.body;
        if (!name || price1 === undefined || stockQuantity === undefined) {
            return res.status(400).json({
                message: "name, price1, and stockQuantity are required",
            });
        }
        // Normalize category
        const normalizedCategory = normalizeCategory(category);
        const product = yield prisma.products.create({
            data: {
                productId,
                name,
                price1,
                price2: price2 !== null && price2 !== void 0 ? price2 : null,
                cp: cp !== null && cp !== void 0 ? cp : null,
                stockQuantity,
                category: normalizedCategory,
            },
        });
        res.status(201).json(product);
    }
    catch (error) {
        if (error.code === "P2002") {
            return res.status(400).json({ message: "Product ID already exists" });
        }
        console.error("Error creating product:", error);
        res.status(500).json({ message: "Error Creating Product" });
    }
});
export const updateProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        const { name, price1, price2, cp, stockQuantity, category } = req.body;
        const product = yield prisma.products.update({
            where: { productId: String(productId) },
            data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (name !== undefined && { name })), (price1 !== undefined && { price1 })), (price2 !== undefined && { price2 })), (cp !== undefined && { cp })), (stockQuantity !== undefined && { stockQuantity })), (category !== undefined && {
                category: normalizeCategory(category),
            })),
        });
        res.json(product);
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ message: "Product not found" });
        }
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Error Updating Product" });
    }
});
