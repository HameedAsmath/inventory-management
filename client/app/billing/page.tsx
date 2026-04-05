"use client";

import {
  useGetBillingsQuery,
  useCreateBillingMutation,
  useUpdateBillingMutation,
  useDeleteBillingMutation,
  useSendBillingEmailMutation,
  type Billing,
  type CreateBillingRequest,
  type UpdateBillingRequest,
} from "../state/api";
import {
  Plus,
  FileText,
  ChevronDown,
  ChevronUp,
  Receipt,
  Clock,
  Package,
  FileDown,
  Mail,
  Loader2,
  Filter,
  Edit2,
  Trash2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/(components)/Header";
import CreateBillingModal from "./CreateBillingModal";
import { toast } from "sonner";

const Billing = () => {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState<Billing | null>(null);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [emailingBillId, setEmailingBillId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>("");
  const [billingIdFilter, setBillingIdFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: billings, isLoading, isError } = useGetBillingsQuery();
  const [createBilling] = useCreateBillingMutation();
  const [updateBilling] = useUpdateBillingMutation();
  const [deleteBilling, { isLoading: isDeletingBill }] =
    useDeleteBillingMutation();
  const [sendBillingEmail] = useSendBillingEmailMutation();

  const openCreateModal = () => {
    setEditingBilling(null);
    setIsModalOpen(true);
  };

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const handleCreateBilling = async (billingData: CreateBillingRequest) => {
    try {
      await createBilling(billingData).unwrap();
      toast.success("Bill created successfully");
      setIsModalOpen(false);
    } catch {
      // error toast handled globally
    }
  };

  const handleUpdateBilling = async (
    billingId: string,
    data: UpdateBillingRequest,
  ) => {
    await updateBilling({ billingId, data }).unwrap();
    toast.success("Bill updated successfully");
  };

  const handleDeleteBilling = async (billing: Billing) => {
    if (isDeletingBill) return;
    if (
      !window.confirm(
        `Delete bill ${billing.billingId}? Sold quantities will be returned to stock, and the customer’s balance will be recalculated from remaining bills and payments.`,
      )
    ) {
      return;
    }
    try {
      await deleteBilling(billing.billingId).unwrap();
      toast.success("Bill deleted");
      setExpandedBill((prev) =>
        prev === billing.billingId ? null : prev,
      );
    } catch {
      /* Error toast: rtkQueryErrorToast middleware (executeMutation only) */
    }
  };

  const handleOpenPdf = (billingId: string) => {
    window.open(`${apiBaseUrl}/billing/${billingId}/pdf`, "_blank");
  };

  const handleSendEmail = async (billingId: string, customerEmail?: string) => {
    const email =
      customerEmail || window.prompt("Enter email address to send invoice to:");
    if (!email) return;

    setEmailingBillId(billingId);
    try {
      const result = await sendBillingEmail({ billingId, email }).unwrap();
      toast.success(result.message || "Invoice sent successfully!");
    } catch {
      // error toast handled globally
    } finally {
      setEmailingBillId(null);
    }
  };

  const toggleExpand = (billingId: string) => {
    setExpandedBill(expandedBill === billingId ? null : billingId);
  };

  const handleOpenCustomerFromBilling = (customer: {
    customerId: string;
    name: string;
  }) => {
    const qs = new URLSearchParams({
      openCustomerId: customer.customerId,
      openCustomerName: customer.name,
    });
    router.push(`/customers?${qs.toString()}`);
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

  const hasActiveFilters =
    selectedCustomerName !== "" ||
    billingIdFilter.trim() !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const customerOptions = useMemo(() => {
    if (!billings) return [];
    const names = new Set<string>();
    for (const bill of billings) {
      names.add(bill.customer.name);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [billings]);

  const filteredBillings = useMemo(() => {
    if (!billings) return [];
    const normalizedBillingId = billingIdFilter.trim().toLowerCase();

    return billings.filter((b) => {
      if (selectedCustomerName && b.customer.name !== selectedCustomerName) {
        return false;
      }
      if (
        normalizedBillingId &&
        !b.billingId.toLowerCase().includes(normalizedBillingId)
      ) {
        return false;
      }
      if (dateFrom && new Date(b.timestamp) < new Date(dateFrom)) return false;
      if (dateTo) {
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        if (new Date(b.timestamp) > toEnd) return false;
      }
      return true;
    });
  }, [billings, selectedCustomerName, billingIdFilter, dateFrom, dateTo]);

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

  const totalRevenue = filteredBillings.reduce(
    (sum, b) => sum + b.totalAmount,
    0,
  );
  const averageBillValue =
    filteredBillings.length > 0 ? totalRevenue / filteredBillings.length : 0;

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
          onClick={openCreateModal}
        >
          <Plus className="w-4 h-4" />
          Create Bill
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">
              Filter
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium">Customer</label>
            <select
              value={selectedCustomerName}
              onChange={(e) => setSelectedCustomerName(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-48"
            >
              <option value="">All Customers</option>
              {customerOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium">
              Billing ID
            </label>
            <input
              type="text"
              value={billingIdFilter}
              onChange={(e) => setBillingIdFilter(e.target.value)}
              placeholder="Search billing id"
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-40"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSelectedCustomerName("");
                setBillingIdFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              Clear
            </button>
          )}
          {hasActiveFilters && (
            <span className="ml-auto text-xs text-gray-400">
              {filteredBillings.length} of {billings.length} bills
            </span>
          )}
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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
            <Receipt className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalRevenue.toFixed(2)}
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
              {filteredBillings.length}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              In Range
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-purple-50 p-3">
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{averageBillValue.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Avg Bill Value
            </p>
          </div>
        </div>
      </div>

      {/* BILLINGS LIST */}
      {filteredBillings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="rounded-full bg-gray-100 p-5 mb-4">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">
            {hasActiveFilters ? "No bills match the filters" : "No bills yet"}
          </p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {hasActiveFilters
              ? "Try adjusting or clearing the filters."
              : "Get started by creating your first bill."}
          </p>
          {!hasActiveFilters && (
            <button
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              onClick={openCreateModal}
            >
              <Plus className="w-4 h-4" />
              Create Bill
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filteredBillings.map((billing, index) => (
            <div
              key={billing.billingId}
              className={index !== 0 ? "border-t border-gray-100" : ""}
            >
              {/* BILL HEADER ROW */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleExpand(billing.billingId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") toggleExpand(billing.billingId);
                }}
                className="w-full px-5 py-3.5 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 hover:bg-gray-50/80 transition-colors cursor-pointer"
              >
                {/* LEFT: Icon + Info */}
                <div className="shrink-0 w-9 h-9 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {billing.customer.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                    <span className="truncate">{billing.billingId}</span>
                    <span>·</span>
                    <span className="shrink-0 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(billing.timestamp)}
                    </span>
                    <span>·</span>
                    <span className="shrink-0">
                      {billing.BillingItem.length} item
                      {billing.BillingItem.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* MIDDLE: Amount */}
                <div className="text-right min-w-[100px]">
                  <p className="text-sm font-bold text-gray-900">
                    ₹{billing.totalAmount.toFixed(2)}
                  </p>
                </div>

                {/* ACTIONS */}
                <div
                  className="flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleOpenPdf(billing.billingId)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSendEmail(billing.billingId, billing.customer.email)
                    }
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                    title="Email"
                  >
                    {emailingBillId === billing.billingId ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Mail className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* CHEVRON */}
                <div className="w-6 flex items-center justify-center">
                  {expandedBill === billing.billingId ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* EXPANDED DETAILS */}
              {expandedBill === billing.billingId && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Customer Details */}
                    <div className="md:col-span-1">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Customer Details
                      </h4>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenCustomerFromBilling({
                            customerId: billing.customer.customerId,
                            name: billing.customer.name,
                          })
                        }
                        className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
                      >
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
                      </button>
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
                                Discount
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
                                  idx !== 0 ? "border-t border-gray-100" : ""
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
                                  ₹{item.price.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-4 text-right text-gray-600">
                                  {item.discount > 0 ? (
                                    <span className="text-red-500">
                                      −₹{item.discount.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-right font-semibold text-gray-900">
                                  ₹{item.subtotal.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            {billing.pnfCharges > 0 && (
                              <>
                                <tr className="border-t border-gray-200 bg-gray-50">
                                  <td
                                    colSpan={4}
                                    className="py-2 px-4 text-right text-sm text-gray-600"
                                  >
                                    Subtotal
                                  </td>
                                  <td className="py-2 px-4 text-right text-sm font-medium text-gray-900">
                                    ₹
                                    {(
                                      billing.totalAmount - billing.pnfCharges
                                    ).toFixed(2)}
                                  </td>
                                </tr>
                                <tr className="bg-gray-50">
                                  <td
                                    colSpan={4}
                                    className="py-2 px-4 text-right text-sm text-gray-600"
                                  >
                                    P&F Charges
                                  </td>
                                  <td className="py-2 px-4 text-right text-sm font-medium text-gray-900">
                                    ₹{billing.pnfCharges.toFixed(2)}
                                  </td>
                                </tr>
                              </>
                            )}
                            <tr className="border-t-2 border-gray-200 bg-gray-50">
                              <td
                                colSpan={4}
                                className="py-3 px-4 text-right text-sm font-semibold text-gray-700"
                              >
                                Total
                              </td>
                              <td className="py-3 px-4 text-right text-base font-bold text-gray-900">
                                ₹{billing.totalAmount.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBilling(billing);
                        setIsModalOpen(true);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit bill
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBilling(billing)}
                      disabled={isDeletingBill}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete bill
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenPdf(billing.billingId)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <FileDown className="w-4 h-4" />
                      Open as PDF
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSendEmail(
                          billing.billingId,
                          billing.customer.email,
                        )
                      }
                      disabled={emailingBillId === billing.billingId}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      {emailingBillId === billing.billingId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4" />
                      )}
                      {emailingBillId === billing.billingId
                        ? "Sending..."
                        : "Email Invoice"}
                    </button>
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
        editingBilling={editingBilling}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBilling(null);
        }}
        onCreate={handleCreateBilling}
        onUpdate={handleUpdateBilling}
      />
    </div>
  );
};

export default Billing;
