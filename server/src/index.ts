import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
/* ROUTE IMPORTS */
import dashboardRoutes from "./routes/dashboardRoutes";
import productRoutes from "./routes/productRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import customerRoutes from "./routes/customerRoutes";
import billingRoutes from "./routes/billingRoutes";
import authRoutes from "./routes/authRoutes";
import { protect } from "./middleware/auth.middleware";
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
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
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
