"use client";

import {
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useSendCustomerStatementEmailMutation,
  type Customer,
  type PaymentStatus,
} from "../state/api";
import {
  Plus,
  SearchIcon,
  Trash2,
  Mail,
  MapPin,
  Users,
  UserPlus,
  Edit2,
  DollarSign,
  X,
  FileText,
  Clock,
  Filter,
  AlertCircle,
  FileDown,
  Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";
import Header from "@/app/(components)/Header";
import CreateCustomerModal from "./CreateCustomerModal";
import { toast } from "sonner";

type CustomerFormData = {
  customerId: string;
  name: string;
  email: string;
  address: string;
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
      return "Paid";
    case "cancelled":
      return "Cancelled";
    case "pending":
    default:
      return "Pending";
  }
};

const formatDate = (timestamp: string) =>
  new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const CustomerBillsModal = ({
  customerId,
  customerName,
  onClose,
}: {
  customerId: string;
  customerName: string;
  onClose: () => void;
}) => {
  const { data: customerData, isLoading } = useGetCustomerByIdQuery(customerId);
  const [sendStatementEmail, { isLoading: isSending }] =
    useSendCustomerStatementEmailMutation();

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">(
    "all",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const billings = useMemo(
    () => customerData?.Billing ?? [],
    [customerData?.Billing],
  );
  const filteredBills = useMemo(() => {
    return billings.filter((bill) => {
      if (statusFilter !== "all" && bill.paymentStatus !== statusFilter)
        return false;
      if (dateFrom && new Date(bill.timestamp) < new Date(dateFrom))
        return false;
      if (dateTo) {
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        if (new Date(bill.timestamp) > toEnd) return false;
      }
      return true;
    });
  }, [billings, statusFilter, dateFrom, dateTo]);

  const summaryTotal = filteredBills.reduce((s, b) => s + b.totalAmount, 0);
  const summaryPaid = filteredBills.reduce((s, b) => s + b.paidAmount, 0);
  const summaryOutstanding = summaryTotal - summaryPaid;

  const clearFilters = () => {
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    statusFilter !== "all" || dateFrom !== "" || dateTo !== "";

  const filterParams = new URLSearchParams();
  if (statusFilter !== "all") filterParams.set("status", statusFilter);
  if (dateFrom) filterParams.set("from", dateFrom);
  if (dateTo) filterParams.set("to", dateTo);
  const qs = filterParams.toString();

  const handleOpenPdf = () => {
    const url = `${apiBaseUrl}/customers/${customerId}/statement/pdf${qs ? `?${qs}` : ""}`;
    window.open(url, "_blank");
  };

  const handleSendEmail = async () => {
    const email =
      customerData?.email ||
      window.prompt("Enter email address to send statement to:");
    if (!email) return;

    try {
      const result = await sendStatementEmail({
        customerId,
        email,
        status: statusFilter !== "all" ? statusFilter : undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      }).unwrap();
      toast.success(result.message || "Statement sent successfully!");
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
        <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 mb-10">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {customerName}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Bill history &amp; payment details
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
          {!isLoading && customerData && (
            <div className="grid grid-cols-3 gap-4 px-6 pt-5 pb-2">
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-center">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                  Total
                </p>
                <p className="text-lg font-bold text-blue-800 mt-0.5">
                  ₹{summaryTotal.toFixed(2)}
                </p>
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
                  Outstanding
                </p>
                <p className="text-lg font-bold text-amber-800 mt-0.5">
                  ₹{summaryOutstanding.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {/* FILTERS */}
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs font-medium uppercase tracking-wider">
                  Filter
                </span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as PaymentStatus | "all")
                }
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="success">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
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

          {/* BILLS LIST */}
          <div className="px-6 py-4 max-h-[50vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FileText className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 font-medium">
                  {hasActiveFilters
                    ? "No bills match the selected filters"
                    : "No bills found for this customer"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBills.map((bill) => {
                  const outstanding = bill.totalAmount - bill.paidAmount;
                  return (
                    <div
                      key={bill.billingId}
                      className="rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {bill.billingId}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDate(bill.timestamp)}
                              </span>
                              <span
                                className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 border ${getStatusColor(
                                  bill.paymentStatus,
                                )}`}
                              >
                                {getStatusLabel(bill.paymentStatus)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            ₹{bill.totalAmount.toFixed(2)}
                          </p>
                          {bill.paymentStatus !== "cancelled" && (
                            <div className="flex items-center gap-3 mt-0.5 justify-end">
                              <span className="text-xs text-emerald-600 font-medium">
                                Paid: ₹{bill.paidAmount.toFixed(2)}
                              </span>
                              {outstanding > 0 && (
                                <span className="text-xs text-amber-600 font-semibold">
                                  Due: ₹{outstanding.toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bill items */}
                      {bill.BillingItem.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {bill.BillingItem.map((item) => (
                              <span
                                key={item.billingItemId}
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
                  );
                })}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {filteredBills.length} bill
              {filteredBills.length !== 1 ? "s" : ""}
              {hasActiveFilters ? " (filtered)" : ""}
            </p>
            <div className="flex items-center gap-3">
              {filteredBills.length > 0 && (
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

const Customers = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [sortByDues, setSortByDues] = useState(false);

  const {
    data: customers,
    isLoading,
    isError,
  } = useGetCustomersQuery(searchTerm);

  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const handleCreateCustomer = async (customerData: CustomerFormData) => {
    try {
      await createCustomer(customerData).unwrap();
      toast.success("Customer created successfully");
    } catch {
      // error toast handled globally
    }
  };

  const handleUpdateCustomer = async (
    customerId: string,
    data: { name: string; email: string; address: string },
  ) => {
    try {
      await updateCustomer({ customerId, data }).unwrap();
      toast.success("Customer updated successfully");
      setEditingCustomer(null);
    } catch {
      // error toast handled globally
    }
  };

  const handleEditClick = (e: React.MouseEvent, customer: Customer) => {
    e.stopPropagation();
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = async (
    e: React.MouseEvent,
    customerId: string,
  ) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteCustomer(customerId).unwrap();
        toast.success("Customer deleted");
      } catch {
        // error toast handled globally
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !customers) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-red-100 p-4 mb-4">
          <Users className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-600 font-medium">Failed to fetch customers</p>
        <p className="text-sm text-gray-400 mt-1">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  const totalCollected = customers.reduce((s, c) => s + (c.totalPaid ?? 0), 0);
  const totalOutstanding = customers.reduce((s, c) => s + (c.balance ?? 0), 0);

  return (
    <div className="mx-auto pb-5 w-full">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Header name="Customers" />
          <p className="text-sm text-gray-500 mt-1">
            Manage your customer database
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => {
            setEditingCustomer(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {customers.length}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Customers
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-emerald-50 p-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalCollected.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Collected
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-amber-50 p-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalOutstanding.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Outstanding
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-purple-50 p-3">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {customers.filter((c) => (c.balance ?? 0) > 0).length}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              With Dues
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH BAR + SORT */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full py-2.5 pl-10 pr-4 rounded-lg bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            placeholder="Search customers by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => setSortByDues((p) => !p)}
          className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
            sortByDues
              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Pending Dues
        </button>
      </div>

      {/* CUSTOMERS LIST */}
      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="rounded-full bg-gray-100 p-5 mb-4">
            <UserPlus className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">
            No customers yet
          </p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            Get started by adding your first customer.
          </p>
          <button
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...customers]
            .sort((a, b) =>
              sortByDues ? (b.balance ?? 0) - (a.balance ?? 0) : 0,
            )
            .map((customer) => {
              const initials = customer.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const colors = [
                "bg-blue-500",
                "bg-emerald-500",
                "bg-violet-500",
                "bg-amber-500",
                "bg-rose-500",
                "bg-cyan-500",
                "bg-indigo-500",
                "bg-teal-500",
              ];
              const colorIndex =
                customer.customerId
                  .split("")
                  .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
                colors.length;

              const pendingDue = customer.balance ?? 0;

              return (
                <div
                  key={customer.customerId}
                  onClick={() =>
                    setViewingCustomer({
                      id: customer.customerId,
                      name: customer.name,
                    })
                  }
                  className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    {/* AVATAR */}
                    <div
                      className={`shrink-0 w-11 h-11 rounded-full ${colors[colorIndex]} flex items-center justify-center`}
                    >
                      <span className="text-sm font-bold text-white">
                        {initials}
                      </span>
                    </div>

                    {/* INFO */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {customer.name}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">
                            {customer.customerId}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <button
                            onClick={(e) => handleEditClick(e, customer)}
                            className="text-gray-300 hover:text-blue-500 transition-colors p-1 hover:bg-blue-50 rounded-md"
                            title="Edit customer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) =>
                              handleDeleteCustomer(e, customer.customerId)
                            }
                            className="text-gray-300 hover:text-red-500 transition-colors p-1 hover:bg-red-50 rounded-md"
                            title="Delete customer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        )}
                        {!customer.email && !customer.address && (
                          <p className="text-xs text-gray-300 italic">
                            No contact details
                          </p>
                        )}
                      </div>

                      {/* PENDING DUES */}
                      {pendingDue > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="text-xs text-gray-500">
                            Pending Dues:
                          </span>
                          <span className="text-xs font-bold text-amber-600">
                            ₹{pendingDue.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {(customer.totalBilled ?? 0) > 0 && pendingDue <= 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="text-xs text-emerald-600 font-medium">
                            All dues cleared
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* CREATE/EDIT CUSTOMER MODAL */}
      <CreateCustomerModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreate={handleCreateCustomer}
        onUpdate={handleUpdateCustomer}
        editingCustomer={editingCustomer}
      />

      {/* CUSTOMER BILLS MODAL */}
      {viewingCustomer && (
        <CustomerBillsModal
          customerId={viewingCustomer.id}
          customerName={viewingCustomer.name}
          onClose={() => setViewingCustomer(null)}
        />
      )}
    </div>
  );
};

export default Customers;
