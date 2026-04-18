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

const allowedOrigins = [
  "https://inventory-management-seven-rose-59.vercel.app",
  "http://localhost:3000",
  "https://roshannotebooks.store",
  "https://www.roshannotebooks.store",
];

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no Origin header (curl, server-to-server, health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Deny without throwing so we don't return a 500 with no CORS headers
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204,
};

// CORS must be the FIRST middleware so preflight (OPTIONS) requests
// always get the right headers, even before helmet/body-parser run.
app.use(cors(corsOptions));
// Handle preflight for all routes (Express 5 compatible regex form).
app.options(/.*/, cors(corsOptions));

app.use(express.json());
app.use(helmet());
app.use(cookieParser());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/* ROUTES */
app.use("/", authRoutes);
app.use("/dashboard", protect, dashboardRoutes);
app.use("/products", protect, productRoutes);
app.use("/expenses", protect, expenseRoutes);
app.use("/customers", protect, customerRoutes);
app.use("/billing", protect, billingRoutes);
app.use("/suppliers", protect, supplierRoutes);
app.use("/purchases", protect, purchaseRoutes);

const port = process.env.PORT || 3001;
app.listen(Number(port), "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
