"use client";

import { useGetDashboardMetricsQuery } from "../state/api";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { useMemo } from "react";

const SalesTrends = () => {
  const { data, isLoading, isError } = useGetDashboardMetricsQuery();
  const salesData = data?.salesSummary || [];

  const chartData = useMemo(() => {
    return salesData
      .slice(-7) // Last 7 days
      .map((item) => ({
        date: new Date(item.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        value: item.totalValue,
        change: item.changePercentage || 0,
      }))
      .reverse();
  }, [salesData]);

  const totalSales = useMemo(() => {
    return salesData.reduce((sum, item) => sum + item.totalValue, 0);
  }, [salesData]);

  const averageChange = useMemo(() => {
    if (salesData.length === 0) return 0;
    const sum = salesData.reduce(
      (acc, item) => acc + (item.changePercentage || 0),
      0,
    );
    return sum / salesData.length;
  }, [salesData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[400px]">
        <p className="text-gray-500">Failed to load sales data</p>
      </div>
    );
  }

  const hasNoData =
    !salesData || salesData.length === 0 || chartData.length === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sales Trends</h3>
          <p className="text-sm text-gray-500 mt-1">Last 7 days</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {totalSales >= 1000000
              ? `₹${(totalSales / 1000000).toFixed(2)}M`
              : totalSales >= 1000
                ? `₹${(totalSales / 1000).toFixed(2)}k`
                : `₹${totalSales.toFixed(2)}`}
          </p>
          {!hasNoData && (
            <div className="flex items-center gap-1 justify-end mt-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-emerald-600 font-medium">
                {averageChange > 0 ? "+" : ""}
                {averageChange.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {!hasNoData && chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              domain={["auto", "auto"]}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `₹${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `₹${(value / 1000).toFixed(1)}k`;
                } else {
                  return `₹${value.toFixed(0)}`;
                }
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "8px 12px",
              }}
              formatter={(value?: number) => [`₹${value?.toFixed(2)}`, "Sales"]}
            />
            <Bar
              dataKey="value"
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
          <TrendingUp className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm font-medium">No sales data available</p>
          <p className="text-xs mt-1">
            Sales data will appear here once available
          </p>
        </div>
      )}
    </div>
  );
};

export default SalesTrends;
