"use client";

import { useGetBillingsQuery } from "../state/api";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { useMemo } from "react";

const RevenueChart = () => {
  const { data: billings, isLoading, isError } = useGetBillingsQuery();

  const chartData = useMemo(() => {
    if (!billings) return [];

    // Group billings by date and calculate daily revenue
    const dailyRevenue = billings.reduce((acc: any, billing) => {
      const dateObj = new Date(billing.timestamp);
      const date = dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      
      if (!acc[date]) {
        acc[date] = { revenue: 0, dateObj };
      }
      
      acc[date].revenue += billing.totalAmount;
      
      return acc;
    }, {});

    // Convert to array and sort by date
    return Object.entries(dailyRevenue)
      .map(([date, data]: [string, any]) => ({
        date,
        revenue: Number(data.revenue),
        dateObj: data.dateObj,
      }))
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .slice(-7); // Last 7 days
  }, [billings]);

  const totalRevenue = useMemo(() => {
    if (!billings) return 0;
    return billings.reduce((sum, b) => sum + b.totalAmount, 0);
  }, [billings]);

  const averageDailyRevenue = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, item) => acc + item.revenue, 0);
    return sum / chartData.length;
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !billings) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[400px]">
        <p className="text-gray-500">Failed to load revenue data</p>
      </div>
    );
  }

  const hasNoData = !billings || billings.length === 0 || chartData.length === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
          <p className="text-sm text-gray-500 mt-1">Last 7 days</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            ₹{totalRevenue.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">Total Revenue</p>
        </div>
      </div>

      {!hasNoData && chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
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
              domain={['auto', 'auto']}
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
              formatter={(value: number) => [`₹${value.toFixed(2)}`, "Revenue"]}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
          <TrendingUp className="w-12 h-12 mb-2 opacity-50" />
          <p className="text-sm font-medium">No revenue data available</p>
          <p className="text-xs mt-1">Start creating bills to see revenue trends</p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-500">Avg. Daily Revenue:</span>
            <span className="font-semibold text-gray-900 ml-2">
              ₹{averageDailyRevenue.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Days Tracked:</span>
            <span className="font-semibold text-gray-900 ml-2">
              {chartData.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RevenueChart;
