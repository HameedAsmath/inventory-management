"use client";

import Header from "@/app/(components)/Header";
import {
  type NewSupplier,
  type Supplier,
  type UpdateSupplier,
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useDeleteSupplierPaymentMutation,
  useGetSupplierLedgerQuery,
  useGetSuppliersQuery,
  useRecordSupplierPaymentMutation,
  useSendSupplierStatementEmailMutation,
  useUpdateSupplierMutation,
  useUpdateSupplierPaymentMutation,
} from "@/app/state/api";
import {
  AlertCircle,
  Clock,
  DollarSign,
  Edit2,
  FileDown,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type SupplierFormData = {
  name: string;
  phone: string;
  address: string;
  openingOutstanding: string;
};

const emptyForm: SupplierFormData = {
  name: "",
  phone: "",
  address: "",
  openingOutstanding: "",
};

const formatDate = (timestamp: string) =>
  new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const SupplierFormModal = ({
  title,
  subtitle,
  form,
  loading,
  onClose,
  onChange,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  form: SupplierFormData;
  loading?: boolean;
  onClose: () => void;
  onChange: (field: keyof SupplierFormData, value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) => (
  <div className="fixed inset-0 z-50 overflow-y-auto">
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    />
    <div className="flex min-h-full items-start justify-center p-4 pt-10">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 mb-10">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Supplier name"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="Phone number"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => onChange("address", e.target.value)}
              placeholder="Address"
              rows={3}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Opening Balance
            </label>
            <div className="relative mt-1">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.openingOutstanding}
                onChange={(e) => onChange("openingOutstanding", e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Amount already owed to this supplier before the first purchase.
              New purchases will accumulate on top of this.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);

const SupplierLedgerModal = ({
  supplierId,
  supplierName,
  onClose,
}: {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
}) => {
  const { data, isLoading } = useGetSupplierLedgerQuery(supplierId);
  const [recordPayment, { isLoading: isRecording }] =
    useRecordSupplierPaymentMutation();
  const [updatePayment, { isLoading: isUpdatingPayment }] =
    useUpdateSupplierPaymentMutation();
  const [deletePayment, { isLoading: isDeletingPayment }] =
    useDeleteSupplierPaymentMutation();
  const [sendStatementEmail, { isLoading: isSending }] =
    useSendSupplierStatementEmailMutation();

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [amountInput, setAmountInput] = useState("");
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingAmountInput, setEditingAmountInput] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const purchases = useMemo(() => data?.purchases ?? [], [data?.purchases]);
  const payments = useMemo(() => data?.payments ?? [], [data?.payments]);
  const openingOutstanding = Math.max(
    0,
    data?.openingOutstanding ?? data?.supplier?.openingOutstanding ?? 0,
  );

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (dateFrom && new Date(p.purchaseDate) < new Date(dateFrom))
        return false;
      if (dateTo) {
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        if (new Date(p.purchaseDate) > toEnd) return false;
      }
      return true;
    });
  }, [purchases, dateFrom, dateTo]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (dateFrom && new Date(p.timestamp) < new Date(dateFrom)) return false;
      if (dateTo) {
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        if (new Date(p.timestamp) > toEnd) return false;
      }
      return true;
    });
  }, [payments, dateFrom, dateTo]);

  const includeOpening = !dateFrom && !dateTo;
  const purchasesTotalInPeriod = filteredPurchases.reduce(
    (s, p) => s + p.totalAmount,
    0,
  );
  const summaryTotal =
    purchasesTotalInPeriod + (includeOpening ? openingOutstanding : 0);
  const summaryPaid = filteredPayments.reduce((s, p) => s + p.amount, 0);
  const summaryOutstanding = Math.max(0, summaryTotal - summaryPaid);
  const summaryCredit = Math.max(0, summaryPaid - summaryTotal);

  const hasActiveFilters = dateFrom !== "" || dateTo !== "";
  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  const statementFilterParams = new URLSearchParams();
  if (dateFrom) statementFilterParams.set("from", dateFrom);
  if (dateTo) statementFilterParams.set("to", dateTo);
  const statementQs = statementFilterParams.toString();

  const handleOpenPdf = () => {
    const url = `${apiBaseUrl}/suppliers/${supplierId}/statement/pdf${
      statementQs ? `?${statementQs}` : ""
    }`;
    window.open(url, "_blank");
  };

  const handleSendEmail = async () => {
    const email = window.prompt("Enter email address to send statement to:");
    if (!email) return;

    try {
      const result = await sendStatementEmail({
        supplierId,
        email,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      }).unwrap();
      toast.success(result.message || "Statement sent successfully!");
    } catch {
      // error toast handled globally
    }
  };

  const handleRecordPayment = async () => {
    const amount = parseFloat(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      await recordPayment({ supplierId, amount }).unwrap();
      toast.success("Payment recorded");
      setAmountInput("");
    } catch {
      // error toast handled globally
    }
  };

  const isPaymentLocked = (paymentTimestamp: string) => {
    const paymentTime = new Date(paymentTimestamp).getTime();
    return purchases.some(
      (purchase) => new Date(purchase.purchaseDate).getTime() > paymentTime,
    );
  };

  const handleStartEditPayment = (paymentId: string, amount: number) => {
    setEditingPaymentId(paymentId);
    setEditingAmountInput(String(amount));
  };

  const handleSavePaymentEdit = async (paymentId: string) => {
    const amount = parseFloat(editingAmountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      await updatePayment({ supplierId, paymentId, amount }).unwrap();
      toast.success("Payment updated");
      setEditingPaymentId(null);
      setEditingAmountInput("");
    } catch {
      // error toast handled globally
    }
  };

  const handleDeletePayment = async (
    paymentId: string,
    paymentTimestamp: string,
  ) => {
    if (isPaymentLocked(paymentTimestamp)) {
      toast.error("Cannot delete payment already used by purchase balances");
      return;
    }
    if (!window.confirm("Delete this payment entry?")) return;
    try {
      await deletePayment({ supplierId, paymentId }).unwrap();
      toast.success("Payment deleted");
      if (editingPaymentId === paymentId) {
        setEditingPaymentId(null);
        setEditingAmountInput("");
      }
    } catch {
      // error toast handled globally
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="flex min-h-full items-start justify-center p-4 pt-10">
        <div className="relative w-full max-w-6xl h-[90vh] rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 mb-10 flex flex-col">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {supplierName}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Ledger, payments and balance
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* SUMMARY */}
          {!isLoading && data && (
            <div className="px-6 pt-5 pb-2 space-y-3">
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
                  <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                    Purchased
                  </p>
                  <p className="text-lg font-bold text-blue-800 mt-0.5">
                    ₹{summaryTotal.toFixed(2)}
                  </p>
                  {includeOpening && openingOutstanding > 0 && (
                    <p className="text-[10px] text-blue-500 mt-0.5">
                      incl. opening ₹{openingOutstanding.toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
                  <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">
                    Paid
                  </p>
                  <p className="text-lg font-bold text-emerald-800 mt-0.5">
                    ₹{summaryPaid.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
                  <p className="text-xs text-amber-600 font-medium uppercase tracking-wider">
                    Payable
                  </p>
                  <p className="text-lg font-bold text-amber-800 mt-0.5">
                    ₹{summaryOutstanding.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-3 text-center">
                  <p className="text-xs text-indigo-600 font-medium uppercase tracking-wider">
                    Credit
                  </p>
                  <p className="text-lg font-bold text-indigo-800 mt-0.5">
                    ₹{summaryCredit.toFixed(2)}
                  </p>
                </div>
              </div>
              {openingOutstanding > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Opening balance:{" "}
                    <span className="font-semibold">
                      ₹{openingOutstanding.toFixed(2)}
                    </span>{" "}
                    was owed before the first purchase.
                    {!includeOpening && (
                      <>
                        {" "}
                        <span className="font-medium">
                          Excluded from the filtered totals above.
                        </span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* RECORD PAYMENT */}
          <div className="px-6 pb-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 flex items-center gap-3">
              <Wallet className="w-4 h-4 text-gray-500" />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter amount paid to supplier"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-56 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleRecordPayment}
                disabled={isRecording}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isRecording ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4" />
                )}
                Record Payment
              </button>
            </div>
          </div>

          {/* FILTERS */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500 font-medium">
                  From
                </label>
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
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="px-6 py-4 flex-1 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full min-h-0">
              {/* PURCHASES LIST */}
              <div className="lg:col-span-2 border border-gray-100 rounded-xl p-3 min-h-0 flex flex-col">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider pb-2">
                  Purchases
                </p>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                    </div>
                  ) : filteredPurchases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <FileText className="w-8 h-8 text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500 font-medium">
                        {hasActiveFilters
                          ? "No purchases match the selected filters"
                          : "No purchases recorded for this supplier"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 pr-1">
                      {filteredPurchases.map((purchase) => (
                        <div
                          key={purchase.purchaseId}
                          className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-blue-500" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {purchase.purchaseId}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(purchase.purchaseDate)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">
                                ₹{purchase.totalAmount.toFixed(2)}
                              </p>
                              {typeof purchase.closingBalance === "number" && (
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  Balance ₹{purchase.closingBalance.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>

                          {purchase.purchaseItems &&
                            purchase.purchaseItems.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-100">
                                <div className="flex flex-wrap gap-2">
                                  {purchase.purchaseItems.map((item) => (
                                    <span
                                      key={item.purchaseItemId}
                                      className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 rounded-md px-2 py-1"
                                    >
                                      {item.product.name}
                                      <span className="text-gray-400">
                                        ×{item.quantity}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* PAYMENT HISTORY */}
              <div className="border border-gray-100 rounded-xl p-3 min-h-0 flex flex-col">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider pb-2">
                  Payment History
                </p>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
                    </div>
                  ) : filteredPayments.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">
                      No payment records for the selected period.
                    </p>
                  ) : (
                    <div className="space-y-2 pr-1">
                      {filteredPayments.map((payment) => {
                        const paymentLocked = isPaymentLocked(
                          payment.timestamp,
                        );
                        return (
                          <div
                            key={payment.paymentId}
                            className="rounded-lg border border-gray-200 px-3 py-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-900">
                                    {payment.type === "advance"
                                      ? "Advance"
                                      : "Payment"}
                                  </p>
                                  {/* <span className="shrink-0 text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(payment.timestamp)}
                                  </span> */}
                                </div>
                                <p className="text-xs text-gray-400 truncate">
                                  <span className="shrink-0 text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(payment.timestamp)}
                                  </span>
                                </p>
                                {paymentLocked && (
                                  <p className="text-xs text-amber-600 mt-1">
                                    Locked: purchase already created after this
                                    payment
                                  </p>
                                )}
                              </div>
                              {editingPaymentId === payment.paymentId ? (
                                <div className="flex items-center gap-2 shrink-0">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editingAmountInput}
                                    onChange={(e) =>
                                      setEditingAmountInput(e.target.value)
                                    }
                                    className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-right"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSavePaymentEdit(payment.paymentId)
                                    }
                                    disabled={isUpdatingPayment}
                                    className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPaymentId(null);
                                      setEditingAmountInput("");
                                    }}
                                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 shrink-0">
                                  <p className="text-sm font-semibold text-emerald-600">
                                    ₹{payment.amount.toFixed(2)}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (paymentLocked) {
                                        toast.error(
                                          "Cannot edit payment already used by purchase balances",
                                        );
                                        return;
                                      }
                                      handleStartEditPayment(
                                        payment.paymentId,
                                        payment.amount,
                                      );
                                    }}
                                    disabled={paymentLocked}
                                    className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeletePayment(
                                        payment.paymentId,
                                        payment.timestamp,
                                      )
                                    }
                                    disabled={
                                      isDeletingPayment || paymentLocked
                                    }
                                    className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filteredPurchases.length} purchase
              {filteredPurchases.length !== 1 ? "s" : ""}
              {hasActiveFilters ? " (filtered)" : ""}
            </p>
            <div className="flex items-center gap-3">
              {filteredPurchases.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleOpenPdf}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <FileDown className="w-4 h-4" />
                    View PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={isSending}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {isSending ? "Sending..." : "Send Email"}
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SuppliersPage = () => {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [form, setForm] = useState<SupplierFormData>(emptyForm);

  const {
    data: suppliers = [],
    isLoading,
    isError,
  } = useGetSuppliersQuery(search);
  const [createSupplier, { isLoading: isCreating }] =
    useCreateSupplierMutation();
  const [updateSupplier, { isLoading: isUpdating }] =
    useUpdateSupplierMutation();
  const [deleteSupplier, { isLoading: isDeleting }] =
    useDeleteSupplierMutation();

  const totalSuppliers = suppliers.length;
  const totalPayable = suppliers.reduce(
    (s, sup) => s + (sup.totalOutstanding ?? sup.balance ?? 0),
    0,
  );
  const totalPaid = suppliers.reduce((s, sup) => s + (sup.totalPaid ?? 0), 0);
  const suppliersWithDues = suppliers.filter(
    (sup) => (sup.totalOutstanding ?? sup.balance ?? 0) > 0,
  ).length;

  const clearForm = () => setForm(emptyForm);
  const openCreate = () => {
    clearForm();
    setEditingSupplier(null);
    setIsCreateOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
      openingOutstanding:
        typeof supplier.openingOutstanding === "number"
          ? String(supplier.openingOutstanding)
          : "",
    });
  };

  const onFieldChange = (field: keyof SupplierFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const parseOpening = (): { ok: true; value: number } | { ok: false } => {
    const raw = form.openingOutstanding.trim();
    if (raw === "") return { ok: true, value: 0 };
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Opening balance must be a non-negative number");
      return { ok: false };
    }
    return { ok: true, value: n };
  };

  const mapCreatePayload = (): NewSupplier | null => {
    const opening = parseOpening();
    if (!opening.ok) return null;
    return {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      openingOutstanding: opening.value,
    };
  };

  const mapUpdatePayload = (): UpdateSupplier | null => {
    const opening = parseOpening();
    if (!opening.ok) return null;
    return {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      openingOutstanding: opening.value,
    };
  };

  const onCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload = mapCreatePayload();
    if (!payload) return;
    try {
      await createSupplier(payload).unwrap();
      toast.success("Supplier created");
      setIsCreateOpen(false);
      clearForm();
    } catch {
      // global error toast handles failures
    }
  };

  const onEditSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSupplier) return;
    const payload = mapUpdatePayload();
    if (!payload) return;
    try {
      await updateSupplier({
        supplierId: editingSupplier.supplierId,
        data: payload,
      }).unwrap();
      toast.success("Supplier updated");
      setEditingSupplier(null);
      clearForm();
    } catch {
      // global error toast handles failures
    }
  };

  const onDelete = async (e: React.MouseEvent, supplier: Supplier) => {
    e.stopPropagation();
    if (!window.confirm(`Delete supplier "${supplier.name}"?`)) return;
    try {
      await deleteSupplier(supplier.supplierId).unwrap();
      toast.success("Supplier deleted");
    } catch {
      // global error toast handles failures
    }
  };

  const sortedSuppliers = useMemo(
    () =>
      [...suppliers].sort((a, b) =>
        a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase()),
      ),
    [suppliers],
  );

  return (
    <div className="mx-auto pb-5 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Header name="Suppliers" />
          <p className="text-sm text-gray-500 mt-1">
            Manage purchase shops, contacts and balances
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <Store className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalSuppliers}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Suppliers
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-emerald-50 p-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalPaid.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Paid
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-amber-50 p-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalPayable.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Payable
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-purple-50 p-3">
            <Store className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {suppliersWithDues}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              With Dues
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : isError ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-red-500">
          Failed to load suppliers
        </div>
      ) : sortedSuppliers.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <Store className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No suppliers found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {sortedSuppliers.map((supplier, index) => {
            const payable = supplier.totalOutstanding ?? supplier.balance ?? 0;
            const credit = supplier.totalCredit ?? 0;
            return (
              <div
                key={supplier.supplierId}
                onClick={() =>
                  setViewingSupplier({
                    id: supplier.supplierId,
                    name: supplier.name,
                  })
                }
                className={`px-5 py-4 cursor-pointer hover:bg-gray-50/80 transition-colors ${
                  index !== 0 ? "border-t border-gray-100" : ""
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      {supplier.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {supplier.phone || "No phone"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {supplier.address || "No address"}
                      </span>
                      {payable > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Payable ₹{payable.toFixed(2)}
                        </span>
                      )}
                      {credit > 0 && (
                        <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                          <Wallet className="w-3.5 h-3.5" />
                          Credit ₹{credit.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => openEdit(supplier)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      disabled={isDeleting}
                      onClick={(e) => onDelete(e, supplier)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isCreateOpen && (
        <SupplierFormModal
          title="Add Supplier"
          subtitle="Create a new purchase supplier"
          form={form}
          loading={isCreating}
          onClose={() => setIsCreateOpen(false)}
          onChange={onFieldChange}
          onSubmit={onCreateSubmit}
        />
      )}

      {editingSupplier && (
        <SupplierFormModal
          title="Edit Supplier"
          subtitle={`Update details for ${editingSupplier.name}`}
          form={form}
          loading={isUpdating}
          onClose={() => setEditingSupplier(null)}
          onChange={onFieldChange}
          onSubmit={onEditSubmit}
        />
      )}

      {viewingSupplier && (
        <SupplierLedgerModal
          supplierId={viewingSupplier.id}
          supplierName={viewingSupplier.name}
          onClose={() => setViewingSupplier(null)}
        />
      )}
    </div>
  );
};

export default SuppliersPage;
