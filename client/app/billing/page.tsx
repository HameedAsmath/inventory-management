"use client";

import {
  useGetBillingsQuery,
  useCreateBillingMutation,
  type CreateBillingRequest,
} from "../state/api";
import {
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
  Receipt,
  DollarSign,
  Clock,
  Package,
} from "lucide-react";
import { useState } from "react";
import Header from "@/app/(components)/Header";
import CreateBillingModal from "./CreateBillingModal";

const Billing = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);

  const { data: billings, isLoading, isError } = useGetBillingsQuery();
  const [createBilling] = useCreateBillingMutation();

  const handleCreateBilling = async (billingData: CreateBillingRequest) => {
    try {
      await createBilling(billingData).unwrap();
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } };
      alert(err?.data?.message || "Failed to create billing");
    }
  };

  const toggleExpand = (billingId: string) => {
    setExpandedBill(expandedBill === billingId ? null : billingId);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !billings) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-red-100 p-4 mb-4">
          <Receipt className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-600 font-medium">Failed to fetch billings</p>
        <p className="text-sm text-gray-400 mt-1">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  const totalRevenue = billings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalItems = billings.reduce(
    (sum, b) => sum + b.BillingItem.length,
    0
  );

  return (
    <div className="mx-auto pb-5 w-full">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Header name="Billing" />
          <p className="text-sm text-gray-500 mt-1">
            View and manage all invoices
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Create Bill
        </button>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <Receipt className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {billings.length}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Bills
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-emerald-50 p-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ${totalRevenue.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Revenue
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-purple-50 p-3">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Items Sold
            </p>
          </div>
        </div>
      </div>

      {/* BILLINGS LIST */}
      {billings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="rounded-full bg-gray-100 p-5 mb-4">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">No bills yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            Get started by creating your first bill.
          </p>
          <button
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Create Bill
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {billings.map((billing, index) => (
            <div
              key={billing.billingId}
              className={index !== 0 ? "border-t border-gray-100" : ""}
            >
              {/* BILL HEADER ROW */}
              <button
                type="button"
                onClick={() => toggleExpand(billing.billingId)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {billing.billingId}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {billing.customer.name}
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(billing.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ${billing.totalAmount.toFixed(2)}
                    </p>
                    <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 mt-0.5">
                      {billing.BillingItem.length} item
                      {billing.BillingItem.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                    {expandedBill === billing.billingId ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* EXPANDED DETAILS */}
              {expandedBill === billing.billingId && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Customer Details */}
                    <div className="md:col-span-1">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Customer Details
                      </h4>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-sm font-semibold text-gray-900">
                          {billing.customer.name}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {billing.customer.customerId}
                        </p>
                        {billing.customer.email && (
                          <p className="text-sm text-gray-600 mt-2">
                            {billing.customer.email}
                          </p>
                        )}
                        {billing.customer.address && (
                          <p className="text-sm text-gray-500 mt-1">
                            {billing.customer.address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="md:col-span-2">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Line Items
                      </h4>
                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left py-2.5 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                Product
                              </th>
                              <th className="text-center py-2.5 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                Qty
                              </th>
                              <th className="text-right py-2.5 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                Price
                              </th>
                              <th className="text-right py-2.5 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                Subtotal
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {billing.BillingItem.map((item, idx) => (
                              <tr
                                key={item.billingItemId}
                                className={
                                  idx !== 0
                                    ? "border-t border-gray-100"
                                    : ""
                                }
                              >
                                <td className="py-2.5 px-4 text-gray-800 font-medium">
                                  {item.product.name}
                                </td>
                                <td className="py-2.5 px-4 text-center text-gray-600">
                                  <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 rounded-md w-8 h-6 text-xs font-medium">
                                    {item.quantity}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right text-gray-600">
                                  ${item.price.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-4 text-right font-semibold text-gray-900">
                                  ${item.subtotal.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-200 bg-gray-50">
                              <td
                                colSpan={3}
                                className="py-3 px-4 text-right text-sm font-semibold text-gray-700"
                              >
                                Total
                              </td>
                              <td className="py-3 px-4 text-right text-base font-bold text-gray-900">
                                ${billing.totalAmount.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
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
      <CreateBillingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreateBilling}
      />
    </div>
  );
};

export default Billing;
