"use client";

import { useGetExpensesQuery } from "../state/api";
import { DollarSign, TrendingDown, Loader2 } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";

const ExpensesOverview = () => {
  const { data: expenses, isLoading, isError } = useGetExpensesQuery();

  const stats = useMemo(() => {
    if (!expenses) return null;

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const pending = expenses
      .filter((e) => e.status === "pending")
      .reduce((sum, e) => sum + e.amount, 0);
    const completed = expenses
      .filter((e) => e.status === "success")
      .reduce((sum, e) => sum + e.amount, 0);
    const recent = expenses
      .filter((e) => {
        const date = new Date(e.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      })
      .reduce((sum, e) => sum + e.amount, 0);

    return { total, pending, completed, recent };
  }, [expenses]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !expenses) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[300px]">
        <p className="text-gray-500">Failed to load expenses</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Expenses Overview
            </h3>
            <p className="text-sm text-gray-500">
              {expenses.length} total {expenses.length === 1 ? "expense" : "expenses"}
            </p>
          </div>
        </div>
        <Link
          href="/expenses"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View All →
        </Link>
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <DollarSign className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">No expenses recorded</p>
          <p className="text-xs mt-1">Start tracking your expenses</p>
        </div>
      ) : stats ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                ₹{stats.total.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-700">
                ₹{stats.pending.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">This Week</span>
              <span className="text-sm font-semibold text-gray-900">
                ₹{stats.recent.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="text-sm font-semibold text-emerald-600">
                ₹{stats.completed.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ExpensesOverview;
