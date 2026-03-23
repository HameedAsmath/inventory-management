import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
/* ROUTE IMPORTS */
import dashboardRoutes from "./routes/dashboardRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import expenseRoutes from "./routes/expenseRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import billingRoutes from "./routes/billingRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import { protect } from "./middleware/auth.middleware.js";
import cookieParser from "cookie-parser";

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(cookieParser());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
const allowedOrigins = [
  "https://inventory-management-seven-rose-59.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

const port = process.env.PORT || 3001;
app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
app.use("/", authRoutes);
app.use("/dashboard", protect, dashboardRoutes);
app.use("/products", protect, productRoutes);
app.use("/expenses", protect, expenseRoutes);
app.use("/customers", protect, customerRoutes);
app.use("/billing", protect, billingRoutes);
app.use("/suppliers", protect, supplierRoutes);
app.use("/purchases", protect, purchaseRoutes);
