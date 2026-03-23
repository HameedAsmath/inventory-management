"use client";

import {
  useGetProductsQuery,
  useGetBillingsQuery,
  useGetExpensesQuery,
} from "../state/api";
import {
  Package,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useMemo } from "react";
import KPICard from "./KPICard";
import RevenueChart from "./RevenueChart";
import LowStockAlerts from "./LowStockAlerts";
import SalesTrends from "./SalesTrends";
import ExpensesOverview from "./ExpensesOverview";
import StockLevels from "./StockLevels";
import ProductSalesReport from "./ProductSalesReport";
import CustomerSalesReport from "./CustomerSalesReport";
import PurchaseAnalyticsPanel from "./PurchaseAnalyticsPanel";
import Header from "../(components)/Header";

const Dashboard = () => {
  const { data: products, isLoading: productsLoading } = useGetProductsQuery();
  const { data: billings, isLoading: billingsLoading } = useGetBillingsQuery();
  const { data: expenses, isLoading: expensesLoading } = useGetExpensesQuery();

  const kpiData = useMemo(() => {
    const totalProducts = products?.length || 0;
    
    const totalRevenue =
      billings?.reduce((sum, b) => sum + b.totalAmount, 0) || 0;

    const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0;

    const lowStockCount =
      products?.filter((p) => p.stockQuantity < 10).length || 0;

    return {
      totalProducts,
      totalRevenue,
      totalExpenses,
      lowStockCount,
    };
  }, [products, billings, expenses]);

  const isLoading = productsLoading || billingsLoading || expensesLoading;
  const hasNoData = 
    (!products || products.length === 0) &&
    (!billings || billings.length === 0) &&
    (!expenses || expenses.length === 0);

  return (
    <div className="mx-auto pb-5 w-full">
      {/* PAGE HEADER */}
      <div className="mb-8">
        <Header name="Dashboard" />
        <p className="text-sm text-gray-500 mt-1">
          Real-time overview of your inventory management system
        </p>
      </div>

      {/* EMPTY STATE */}
      {!isLoading && hasNoData && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center mb-8">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Welcome to your Dashboard
          </h3>
          <p className="text-sm text-gray-500 text-center max-w-md mb-6">
            Get started by adding products, creating bills, and tracking expenses. 
            Your dashboard will populate with insights as you use the system.
          </p>
          <div className="flex gap-3">
            <a
              href="/products"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Add Products
            </a>
            <a
              href="/billing"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Create Bill
            </a>
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Total Products"
          value={kpiData.totalProducts.toLocaleString()}
          icon={Package}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
        />
        <KPICard
          title="Total Revenue"
          value={`₹${kpiData.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
        />
        <KPICard
          title="Total Expenses"
          value={`₹${kpiData.totalExpenses.toFixed(2)}`}
          icon={TrendingUp}
          iconColor="text-purple-600"
          iconBgColor="bg-purple-50"
        />
        <KPICard
          title="Low Stock Items"
          value={kpiData.lowStockCount}
          icon={AlertTriangle}
          iconColor="text-red-600"
          iconBgColor="bg-red-50"
          subtitle={kpiData.lowStockCount > 0 ? "Need attention" : "All good"}
        />
      </div>

      {/* MAIN CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RevenueChart />
        <SalesTrends />
      </div>

      {/* SECONDARY METRICS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <LowStockAlerts />
        <ExpensesOverview />
        <StockLevels />
      </div>

      {/* SALES REPORTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductSalesReport />
        <CustomerSalesReport />
      </div>

      {/* PURCHASE ANALYTICS */}
      <div className="mt-6">
        <PurchaseAnalyticsPanel />
      </div>
    </div>
  );
};

export default Dashboard;
