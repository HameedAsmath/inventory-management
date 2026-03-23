var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { prisma } from "../src/lib/prisma";
import "dotenv/config";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Map file names to Prisma model names
const modelNameMap = {
    products: "products",
    users: "users",
    sales: "sales",
    salesSummary: "salesSummary",
    expenseSummary: "expenseSummary",
    suppliers: "supplier",
    purchases: "purchase",
    purchaseItems: "purchaseItem",
    customers: "customer",
    billings: "billing",
    billingItems: "billingItem",
};
function deleteAllData(orderedFileNames) {
    return __awaiter(this, void 0, void 0, function* () {
        const modelNames = orderedFileNames.map((fileName) => {
            const baseName = path.basename(fileName, path.extname(fileName));
            return (modelNameMap[baseName] ||
                baseName.charAt(0).toUpperCase() + baseName.slice(1));
        });
        // Delete in reverse to satisfy FK constraints (children before parents)
        for (const modelName of [...modelNames].reverse()) {
            const model = prisma[modelName];
            if (model) {
                yield model.deleteMany({});
                console.log(`Cleared data from ${modelName}`);
            }
            else {
                console.error(`Model ${modelName} not found. Please ensure the model name is correctly specified`);
            }
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const dataDirectory = path.join(__dirname, "seedData");
        const orderedFileNames = [
            "products.json",
            "expenseSummary.json",
            "sales.json",
            "salesSummary.json",
            "users.json",
            // "expenses.json",
            "suppliers.json",
            "purchases.json",
            "purchaseItems.json",
            "customers.json",
            "billings.json",
            "billingItems.json",
        ];
        yield deleteAllData(orderedFileNames);
        for (const fileName of orderedFileNames) {
            const filePath = path.join(dataDirectory, fileName);
            const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            const baseName = path.basename(fileName, path.extname(fileName));
            const modelName = modelNameMap[baseName] ||
                baseName.charAt(0).toUpperCase() + baseName.slice(1);
            const model = prisma[modelName];
            if (!model) {
                console.error(`No Prisma model matches the file name: ${fileName} (mapped to ${modelName})`);
                continue;
            }
            for (const data of jsonData) {
                try {
                    yield model.create({
                        data,
                    });
                }
                catch (error) {
                    console.error(`Error creating record in ${modelName}:`, error.message);
                    throw error;
                }
            }
            console.log(`Seeded ${modelName} with data from ${fileName}`);
        }
    });
}
main()
    .catch((e) => {
    console.error(e);
})
    .finally(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}));
