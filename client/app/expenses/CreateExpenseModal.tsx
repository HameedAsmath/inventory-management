"use client";

import React, { FormEvent, useState, useEffect } from "react";
import {
  type CreateExpenseRequest,
  type UpdateExpenseRequest,
  type Expense,
  type PaymentStatus,
} from "../state/api";
import {
  Plus,
  X,
  FileText,
  DollarSign,
  Edit2,
  Loader2,
} from "lucide-react";

type CreateExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateExpenseRequest) => void;
  onUpdate: (expenseId: string, data: UpdateExpenseRequest) => void;
  editingExpenseId: string | null;
  expenses: Expense[];
};

const CreateExpenseModal = ({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  editingExpenseId,
  expenses,
}: CreateExpenseModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [error, setError] = useState("");

  const editingExpense = editingExpenseId
    ? expenses.find((e) => e.expenseId === editingExpenseId)
    : null;

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title);
      setDescription(editingExpense.description || "");
      setAmount(editingExpense.amount.toString());
      setStatus(editingExpense.status);
    } else {
      resetForm();
    }
  }, [editingExpense, isOpen]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAmount("");
    setStatus("pending");
    setError("");
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    if (editingExpense) {
      onUpdate(editingExpense.expenseId, {
        title: title.trim(),
        description: description.trim() || undefined,
        amount: amountNum,
        status,
      });
    } else {
      onCreate({
        title: title.trim(),
        description: description.trim() || undefined,
        amount: amountNum,
        status,
      });
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* BACKDROP */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* MODAL */}
      <div className="flex min-h-full items-start justify-center p-4 pt-10">
        <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 mb-10">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {editingExpense ? "Edit Expense" : "Add New Expense"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {editingExpense
                  ? "Update expense details"
                  : "Fill in the details to add a new expense"}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              {/* ERROR MESSAGE */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {error}
                </div>
              )}

              {/* TITLE */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <label
                    htmlFor="title"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Title <span className="text-red-500">*</span>
                  </label>
                </div>
                <input
                  id="title"
                  type="text"
                  placeholder="Enter expense title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  required
                />
              </div>

              {/* DESCRIPTION */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <label
                    htmlFor="description"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Description
                  </label>
                </div>
                <textarea
                  id="description"
                  placeholder="Enter expense description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                />
              </div>

              {/* AMOUNT */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <label
                    htmlFor="amount"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Amount <span className="text-red-500">*</span>
                  </label>
                </div>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  required
                />
              </div>

              {/* STATUS */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <label
                    htmlFor="status"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Status
                  </label>
                </div>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                >
                  <option value="pending">Pending</option>
                  <option value="success">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* FOOTER */}
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleClose}
                  type="button"
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || !amount}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-sm"
                >
                  {editingExpense ? (
                    <>
                      <Edit2 className="w-4 h-4" />
                      Update Expense
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Expense
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateExpenseModal;
