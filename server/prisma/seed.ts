import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { prisma } from "../src/lib/prisma";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Map file names to Prisma model names
const modelNameMap: Record<string, string> = {
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

function withProductSerialNumber(
  baseName: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (baseName !== "products") return data;
  const existingSerial =
    typeof data.serialNumber === "string" ? data.serialNumber.trim() : "";
  if (existingSerial.length >= 3) return data;
  const rawId = typeof data.productId === "string" ? data.productId : "";
  const compactId = rawId.replace(/-/g, "");
  return {
    ...data,
    serialNumber: `SN-${compactId.slice(0, 8) || Math.random().toString(36).slice(2, 10)}`,
  };
}

async function deleteAllData(orderedFileNames: string[]) {
  const modelNames = orderedFileNames.map((fileName) => {
    const baseName = path.basename(fileName, path.extname(fileName));
    return (
      modelNameMap[baseName] ||
      baseName.charAt(0).toUpperCase() + baseName.slice(1)
    );
  });

  // Delete in reverse to satisfy FK constraints (children before parents)
  for (const modelName of [...modelNames].reverse()) {
    const model: any = prisma[modelName as keyof typeof prisma];
    if (model) {
      await model.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } else {
      console.error(
        `Model ${modelName} not found. Please ensure the model name is correctly specified`,
      );
    }
  }
}

async function main() {
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

  await deleteAllData(orderedFileNames);

  for (const fileName of orderedFileNames) {
    const filePath = path.join(dataDirectory, fileName);
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const baseName = path.basename(fileName, path.extname(fileName));
    const modelName =
      modelNameMap[baseName] ||
      baseName.charAt(0).toUpperCase() + baseName.slice(1);
    const model: any = prisma[modelName as keyof typeof prisma];

    if (!model) {
      console.error(
        `No Prisma model matches the file name: ${fileName} (mapped to ${modelName})`,
      );
      continue;
    }

    for (const row of jsonData) {
      const data = withProductSerialNumber(baseName, row);
      try {
        await model.create({
          data,
        });
      } catch (error: any) {
        console.error(`Error creating record in ${modelName}:`, error.message);
        throw error;
      }
    }

    console.log(`Seeded ${modelName} with data from ${fileName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
