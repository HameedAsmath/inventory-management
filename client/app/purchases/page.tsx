"use client";

import Header from "@/app/(components)/Header";
import {
  type CreatePurchaseRequest,
  type Purchase,
  useCreatePurchaseMutation,
  useGetProductsQuery,
  useGetPurchasesQuery,
  useGetSuppliersQuery,
} from "@/app/state/api";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Filter,
  Loader2,
  Package,
  Plus,
  ShoppingCart,
  Store,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import CreatePurchaseModal, { type CreatePurchaseData } from "./CreatePurchaseModal";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const PurchasesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  const [selectedSupplierName, setSelectedSupplierName] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: products = [] } = useGetProductsQuery();
  const { data: purchases = [], isLoading: purchasesLoading } = useGetPurchasesQuery();
  const [createPurchase, { isLoading: isSaving }] = useCreatePurchaseMutation();

  const handleCreatePurchase = async (purchaseData: CreatePurchaseData) => {
    try {
      await createPurchase(purchaseData as CreatePurchaseRequest).unwrap();
      toast.success("Purchase recorded successfully");
      setIsModalOpen(false);
    } catch {
      // handled by global toast middleware
    }
  };

  const toggleExpand = (purchaseId: string) => {
    setExpandedPurchase(expandedPurchase === purchaseId ? null : purchaseId);
  };

  const hasActiveFilters =
    selectedSupplierName !== "" || dateFrom !== "" || dateTo !== "";

  const filteredPurchases = useMemo(() => {
    return purchases.filter((purchase) => {
      if (
        selectedSupplierName &&
        purchase.supplier?.name !== selectedSupplierName
      ) {
        return false;
      }
      if (dateFrom && new Date(purchase.purchaseDate) < new Date(dateFrom)) {
        return false;
      }
      if (dateTo) {
        const toEnd = new Date(dateTo);
        toEnd.setHours(23, 59, 59, 999);
        if (new Date(purchase.purchaseDate) > toEnd) return false;
      }
      return true;
    });
  }, [purchases, selectedSupplierName, dateFrom, dateTo]);

  const totalPurchaseCost = filteredPurchases.reduce(
    (sum, purchase) => sum + purchase.totalAmount,
    0,
  );
  const avgPurchaseCost =
    filteredPurchases.length > 0 ? totalPurchaseCost / filteredPurchases.length : 0;
  const totalStockUnits = products.reduce((sum, product) => sum + product.stockQuantity, 0);

  const supplierOptions = useMemo(() => {
    const names = new Set<string>();
    purchases.forEach((purchase) => {
      if (purchase.supplier?.name) names.add(purchase.supplier.name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [purchases]);

  return (
    <div className="mx-auto pb-5 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Header name="Purchases" />
          <p className="text-sm text-gray-500 mt-1">
            View and manage all supplier purchases
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50"
          onClick={() => setIsModalOpen(true)}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Create Purchase
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Filter</span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 font-medium">Supplier</label>
            <select
              value={selectedSupplierName}
              onChange={(e) => setSelectedSupplierName(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-48"
            >
              <option value="">All Suppliers</option>
              {supplierOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
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
                setSelectedSupplierName("");
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
              {filteredPurchases.length} of {purchases.length} purchases
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{purchases.length}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Purchases
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-emerald-50 p-3">
            <Store className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              ₹{totalPurchaseCost.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Purchase Cost
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-amber-50 p-3">
            <Calendar className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{filteredPurchases.length}</p>
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
            <p className="text-2xl font-bold text-gray-900">₹{avgPurchaseCost.toFixed(2)}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Avg Purchase Value
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {purchasesLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="rounded-full bg-gray-100 p-5 mb-4">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-700 font-semibold text-lg">
              {hasActiveFilters
                ? "No purchases match the filters"
                : "No purchases yet"}
            </p>
            <p className="text-sm text-gray-400 mt-1 mb-5">
              {hasActiveFilters
                ? "Try adjusting or clearing the filters."
                : "Get started by creating your first purchase."}
            </p>
            {!hasActiveFilters && (
              <button
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Create Purchase
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredPurchases.map((purchase: Purchase, index) => (
              <div
                key={purchase.purchaseId}
                className={index !== 0 ? "border-t border-gray-100" : ""}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(purchase.purchaseId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") toggleExpand(purchase.purchaseId);
                  }}
                  className="w-full px-5 py-3.5 grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 hover:bg-gray-50/80 transition-colors cursor-pointer"
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <ShoppingCart className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {purchase.supplier?.name || "Unknown Supplier"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(purchase.purchaseDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {purchase.purchaseItems.length} items
                      </span>
                      {purchase.notes && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {purchase.notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right min-w-[100px]">
                    <p className="text-sm font-bold text-gray-900">
                      ₹{purchase.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="w-6 flex items-center justify-center">
                    {expandedPurchase === purchase.purchaseId ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {expandedPurchase === purchase.purchaseId && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                          Supplier Details
                        </h4>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <p className="text-sm font-semibold text-gray-900">
                            {purchase.supplier?.name}
                          </p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">
                            {purchase.supplier?.supplierId}
                          </p>
                          {purchase.supplier?.phone && (
                            <p className="text-sm text-gray-600 mt-2">
                              {purchase.supplier.phone}
                            </p>
                          )}
                          {purchase.supplier?.address && (
                            <p className="text-sm text-gray-500 mt-1">
                              {purchase.supplier.address}
                            </p>
                          )}
                        </div>
                      </div>

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
                                  Cost Price
                                </th>
                                <th className="text-right py-2.5 px-4 font-medium text-gray-600 text-xs uppercase tracking-wider">
                                  Subtotal
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {purchase.purchaseItems.map((item, idx) => (
                                <tr
                                  key={item.purchaseItemId}
                                  className={idx !== 0 ? "border-t border-gray-100" : ""}
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
                                    ₹{item.costPrice.toFixed(2)}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-semibold text-gray-900">
                                    ₹{item.totalCost.toFixed(2)}
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
                                  ₹{purchase.totalAmount.toFixed(2)}
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
      </div>

      <CreatePurchaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={handleCreatePurchase}
      />
    </div>
  );
};

export default PurchasesPage;
