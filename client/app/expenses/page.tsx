"use client";

import {
  useGetExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  type CreateExpenseRequest,
  type UpdateExpenseRequest,
  type PaymentStatus,
} from "../state/api";
import {
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Trash2,
  Edit2,
} from "lucide-react";
import { useState } from "react";
import Header from "@/app/(components)/Header";
import CreateExpenseModal from "./CreateExpenseModal";

const Expenses = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");

  const {
    data: expenses,
    isLoading,
    isError,
  } = useGetExpensesQuery(statusFilter === "all" ? undefined : statusFilter);
  const [createExpense] = useCreateExpenseMutation();
  const [updateExpense] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const handleCreateExpense = async (expenseData: CreateExpenseRequest) => {
    try {
      await createExpense(expenseData).unwrap();
      setIsModalOpen(false);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      alert(err?.data?.message || "Failed to create expense");
    }
  };

  const handleUpdateExpense = async (
    expenseId: string,
    data: UpdateExpenseRequest
  ) => {
    try {
      await updateExpense({ expenseId, data }).unwrap();
      setEditingExpense(null);
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      alert(err?.data?.message || "Failed to update expense");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await deleteExpense(expenseId).unwrap();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      alert(err?.data?.message || "Failed to delete expense");
    }
  };

  const toggleExpand = (expenseId: string) => {
    setExpandedExpense(expandedExpense === expenseId ? null : expenseId);
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "success":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      case "pending":
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  const getStatusLabel = (status: PaymentStatus) => {
    switch (status) {
      case "success":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "pending":
      default:
        return "Pending";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !expenses) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-red-100 p-4 mb-4">
          <FileText className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-600 font-medium">Failed to fetch expenses</p>
        <p className="text-sm text-gray-400 mt-1">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingAmount = expenses
    .filter((e) => e.status === "pending")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="mx-auto pb-5 w-full">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Header name="Expenses" />
          <p className="text-sm text-gray-500 mt-1">
            Track and manage all business expenses
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {expenses.length}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Expenses
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-emerald-50 p-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalAmount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Amount
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-amber-50 p-3">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{pendingAmount.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Pending Amount
            </p>
          </div>
        </div>
      </div>

      {/* FILTER */}
      <div className="mb-6 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as PaymentStatus | "all")
          }
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="success">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* EXPENSES LIST */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="rounded-full bg-gray-100 p-5 mb-4">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">No expenses yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            Get started by adding your first expense.
          </p>
          <button
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {expenses.map((expense, index) => (
            <div
              key={expense.expenseId}
              className={index !== 0 ? "border-t border-gray-100" : ""}
            >
              {/* EXPENSE HEADER ROW */}
              <button
                type="button"
                onClick={() => toggleExpand(expense.expenseId)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {expense.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(expense.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right mr-1">
                    <p className="text-sm font-bold text-gray-900">
                      ₹{expense.amount.toFixed(2)}
                    </p>
                    <span
                      className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 mt-0.5 border ${getStatusColor(
                        expense.status
                      )}`}
                    >
                      {getStatusLabel(expense.status)}
                    </span>
                  </div>
                  {/* EDIT BUTTON */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingExpense(expense.expenseId);
                      setIsModalOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        setEditingExpense(expense.expenseId);
                        setIsModalOpen(true);
                      }
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-blue-50 transition-colors cursor-pointer"
                    title="Edit Expense"
                  >
                    <Edit2 className="w-4 h-4 text-blue-500" />
                  </div>
                  {/* DELETE BUTTON */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteExpense(expense.expenseId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        handleDeleteExpense(expense.expenseId);
                      }
                    }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Expense"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </div>
                  {/* EXPAND CHEVRON */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                    {expandedExpense === expense.expenseId ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* EXPANDED DETAILS */}
              {expandedExpense === expense.expenseId && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Expense Details */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Expense Details
                      </h4>
                      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                            Title
                          </p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {expense.title}
                          </p>
                        </div>
                        {expense.description && (
                          <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                              Description
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {expense.description}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                            Amount
                          </p>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            ₹{expense.amount.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                            Status
                          </p>
                          <span
                            className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-1 mt-1 border ${getStatusColor(
                              expense.status
                            )}`}
                          >
                            {getStatusLabel(expense.status)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Update */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Update Status
                      </h4>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <select
                          value={expense.status}
                          onChange={(e) =>
                            handleUpdateExpense(expense.expenseId, {
                              status: e.target.value as PaymentStatus,
                            })
                          }
                          className={`w-full px-4 py-2 rounded-lg border ${getStatusColor(
                            expense.status
                          )} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        >
                          <option value="pending">Pending</option>
                          <option value="success">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      <CreateExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        onCreate={handleCreateExpense}
        onUpdate={handleUpdateExpense}
        editingExpenseId={editingExpense}
        expenses={expenses || []}
      />
    </div>
  );
};

export default Expenses;
