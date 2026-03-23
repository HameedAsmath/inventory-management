"use client";

import { useGetPurchaseAnalyticsQuery } from "../state/api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Loader2,
  Package,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";

const PurchaseAnalyticsPanel = () => {
  const { data, isLoading, isError } = useGetPurchaseAnalyticsQuery();

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[420px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[420px]">
        <p className="text-gray-500">Failed to load purchase analytics</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Purchase Analytics
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Stock, cost and monthly purchasing insights
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-600 uppercase tracking-wider font-medium">
            Today Purchases
          </p>
          <p className="text-lg font-bold text-blue-800 mt-1">
            ₹{data.totalPurchasesToday.toFixed(2)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-100">
          <p className="text-xs text-indigo-600 uppercase tracking-wider font-medium">
            Total Purchase Cost
          </p>
          <p className="text-lg font-bold text-indigo-800 mt-1">
            ₹{data.totalPurchaseCost.toFixed(2)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
          <p className="text-xs text-emerald-600 uppercase tracking-wider font-medium">
            Stock Value (CP)
          </p>
          <p className="text-lg font-bold text-emerald-800 mt-1">
            ₹{data.stockValue.toFixed(2)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
          <p className="text-xs text-amber-600 uppercase tracking-wider font-medium">
            Stock Units
          </p>
          <p className="text-lg font-bold text-amber-800 mt-1">
            {data.stockLevels.totalStockUnits}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              Monthly Purchase Trend
            </h4>
          </div>
          {data.monthlyPurchaseTrend.length === 0 ? (
            <p className="text-sm text-gray-500">
              No purchase trend data available yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthlyPurchaseTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip
                  formatter={(value?: number) => [
                    `₹${value?.toFixed(2)}`,
                    "Total Cost",
                  ]}
                />
                <Bar dataKey="totalCost" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-semibold text-gray-900">
              Top Purchased Products
            </h4>
          </div>
          {data.topPurchasedProducts.length === 0 ? (
            <p className="text-sm text-gray-500">
              No purchased product data yet
            </p>
          ) : (
            <div className="space-y-2">
              {data.topPurchasedProducts.map((item, idx) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between border border-gray-100 rounded-md px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">
                      #{idx + 1} {item.productName}
                    </p>
                    <p className="text-xs text-gray-500">
                      Qty {item.totalQuantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    ₹{item.totalCost.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-500" />
          Low stock:{" "}
          <span className="font-semibold">
            {data.stockLevels.lowStockCount}
          </span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-gray-500" />
          Out of stock:{" "}
          <span className="font-semibold">
            {data.stockLevels.outOfStockCount}
          </span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-gray-500" />
          Purchase entries:{" "}
          <span className="font-semibold">{data.purchaseCount}</span>
        </div>
      </div>
    </div>
  );
};

export default PurchaseAnalyticsPanel;
