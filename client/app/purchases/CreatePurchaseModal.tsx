"use client";

import React, { FormEvent, useEffect, useMemo, useState } from "react";
import {
  useGetProductsQuery,
  useGetSuppliersQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  type Product,
} from "../state/api";
import {
  Calendar,
  CheckCircle2,
  Edit2,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import CreateProductModal from "../products/CreateProductModal";

type PurchaseItemInput = {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  stockQuantity: number;
};

export type CreatePurchaseData = {
  supplierId: string;
  purchaseDate: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    costPrice: number;
  }>;
};

type CreatePurchaseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreatePurchaseData) => void;
};

const CreatePurchaseModal = ({
  isOpen,
  onClose,
  onCreate,
}: CreatePurchaseModalProps) => {
  const [supplierId, setSupplierId] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplierName, setSelectedSupplierName] = useState("");
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<PurchaseItemInput[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [error, setError] = useState("");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productBeingEdited, setProductBeingEdited] = useState<Product | null>(
    null,
  );

  const { data: suppliers } = useGetSuppliersQuery(supplierSearch);
  const { data: products } = useGetProductsQuery(
    productSearch ? { search: productSearch } : undefined,
  );
  const { data: catalogProducts } = useGetProductsQuery(undefined, {
    skip: !isOpen,
  });
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  const productCategories = useMemo(() => {
    if (!catalogProducts) return [];
    const set = new Set<string>();
    catalogProducts.forEach((p) => {
      if (p.category?.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [catalogProducts]);

  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.costPrice, 0),
    [items],
  );

  const handleSelectSupplier = (id: string) => {
    setSupplierId(id);
    const supplier = suppliers?.find((s) => s.supplierId === id);
    setSelectedSupplierName(supplier?.name || id);
    setSupplierSearch(supplier?.name || id);
    setShowSupplierDropdown(false);
  };

  const handleClearSupplier = () => {
    setSupplierId("");
    setSelectedSupplierName("");
    setSupplierSearch("");
  };

  const handleAddProduct = (product: Product): boolean => {
    if (items.some((item) => item.productId === product.productId)) {
      setError(`${product.name} is already added. Adjust the quantity instead.`);
      setShowProductDropdown(false);
      setProductSearch("");
      return false;
    }

    setItems((prev) => [
      ...prev,
      {
        productId: product.productId,
        productName: product.name,
        quantity: 1,
        costPrice: product.cp ?? 0,
        stockQuantity: product.stockQuantity,
      },
    ]);
    setProductSearch("");
    setShowProductDropdown(false);
    setError("");
    return true;
  };

  const handleRemoveItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      ),
    );
  };

  const handleCostPriceChange = (productId: string, costPrice: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, costPrice: Math.max(0, costPrice) }
          : item,
      ),
    );
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!supplierId) {
      setError("Please select a supplier.");
      return;
    }
    if (!purchaseDate) {
      setError("Please choose a purchase date.");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one product.");
      return;
    }
    if (items.some((item) => item.costPrice <= 0)) {
      setError("Cost price must be greater than 0 for all items.");
      return;
    }

    const payload: CreatePurchaseData = {
      supplierId,
      purchaseDate: new Date(purchaseDate).toISOString(),
      notes: notes.trim() || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        costPrice: item.costPrice,
      })),
    };

    onCreate(payload);
    resetForm();
  };

  const resetForm = () => {
    setSupplierId("");
    setSupplierSearch("");
    setSelectedSupplierName("");
    setShowSupplierDropdown(false);
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setItems([]);
    setProductSearch("");
    setShowProductDropdown(false);
    setError("");
    setProductFormOpen(false);
    setProductBeingEdited(null);
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCloseProductForm = () => {
    setProductFormOpen(false);
    setProductBeingEdited(null);
  };

  const syncPurchaseLineFromProduct = (updated: Product) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== updated.productId) return item;
        return {
          ...item,
          productName: updated.name,
          stockQuantity: updated.stockQuantity,
          costPrice:
            updated.cp != null && updated.cp > 0
              ? updated.cp
              : item.costPrice,
        };
      }),
    );
  };

  const handleCreateProductFromModal = async (formData: {
    name: string;
    price1: number;
    price2?: number;
    cp?: number;
    stockQuantity: number;
    lowStockQuantity: number;
    category?: string;
  }) => {
    try {
      const created = await createProduct(formData).unwrap();
      toast.success("Product created");
      if (handleAddProduct(created)) {
        handleCloseProductForm();
      }
    } catch {
      /* toast from global handler */
    }
  };

  const handleUpdateProductFromModal = async (
    productId: string,
    formData: {
      name: string;
      price1: number;
      price2?: number;
      cp?: number;
      stockQuantity: number;
      lowStockQuantity: number;
      category?: string;
    },
  ) => {
    try {
      const updated = await updateProduct({ productId, data: formData }).unwrap();
      toast.success("Product updated");
      syncPurchaseLineFromProduct(updated);
      handleCloseProductForm();
    } catch {
      /* toast from global handler */
    }
  };

  const handleEditLineProduct = (productId: string) => {
    const p = catalogProducts?.find((x) => x.productId === productId);
    if (!p) {
      toast.error("Product could not be loaded. Try again in a moment.");
      return;
    }
    setProductBeingEdited(p);
    setProductFormOpen(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="flex min-h-full items-start justify-center p-4 pt-10">
        <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 mb-10">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create Purchase</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Select supplier and add purchased products
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
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <Store className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Supplier</h3>
                </div>

                {supplierId ? (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedSupplierName}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">{supplierId}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSupplier}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-blue-100 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search supplier..."
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowSupplierDropdown(false), 200)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                    {showSupplierDropdown &&
                      suppliers &&
                      suppliers.length > 0 && (
                        <div className="absolute z-30 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1.5 max-h-48 overflow-y-auto">
                          {suppliers.map((supplier) => (
                            <button
                              key={supplier.supplierId}
                              type="button"
                              onClick={() =>
                                handleSelectSupplier(supplier.supplierId)
                              }
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-3 border-b border-gray-50 last:border-b-0 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                <span className="text-xs font-semibold text-gray-600">
                                  {supplier.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">
                                  {supplier.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {supplier.supplierId}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Purchase Date
                  </label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes"
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">Products</h3>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search and add products..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowProductDropdown(false), 200)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />

                    {showProductDropdown &&
                      productSearch &&
                      products &&
                      products.length > 0 && (
                        <div className="absolute z-30 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1.5 max-h-52 overflow-y-auto">
                          {products.map((product) => {
                            const alreadyAdded = items.some(
                              (item) => item.productId === product.productId,
                            );
                            return (
                              <button
                                key={product.productId}
                                type="button"
                                onClick={() => handleAddProduct(product)}
                                disabled={alreadyAdded}
                                className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-gray-50 last:border-b-0 transition-colors ${
                                  alreadyAdded
                                    ? "bg-gray-50 opacity-50 cursor-not-allowed"
                                    : "hover:bg-gray-50"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      {product.name}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      CP: ₹{(product.cp ?? 0).toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                                {alreadyAdded && (
                                  <span className="text-xs text-gray-400">
                                    (added)
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProductBeingEdited(null);
                      setProductFormOpen(true);
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New product
                  </button>
                </div>

                {items.length > 0 ? (
                  <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-2.5 text-gray-600 font-medium text-xs uppercase tracking-wider">
                            Product
                          </th>
                          <th className="text-center px-4 py-2.5 text-gray-600 font-medium text-xs uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="text-right px-4 py-2.5 text-gray-600 font-medium text-xs uppercase tracking-wider">
                            Cost Price
                          </th>
                          <th className="text-right px-4 py-2.5 text-gray-600 font-medium text-xs uppercase tracking-wider">
                            Subtotal
                          </th>
                          <th className="w-20 px-2 py-2.5 text-center text-gray-600 font-medium text-xs uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr
                            key={item.productId}
                            className={idx !== 0 ? "border-t border-gray-100" : ""}
                          >
                            <td className="px-4 py-3">
                              <p className="text-gray-800 font-medium">
                                {item.productName}
                              </p>
                              <p className="text-xs text-gray-400">
                                Stock: {item.stockQuantity}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      item.quantity - 1,
                                    )
                                  }
                                  className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors text-xs font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item.productId,
                                      parseInt(e.target.value) || 1,
                                    )
                                  }
                                  className="w-12 py-1 text-center text-sm border-x border-gray-200 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      item.quantity + 1,
                                    )
                                  }
                                  className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={item.costPrice}
                                onChange={(e) =>
                                  handleCostPriceChange(
                                    item.productId,
                                    Number(e.target.value),
                                  )
                                }
                                className="w-28 text-right text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              ₹{(item.quantity * item.costPrice).toFixed(2)}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <div className="inline-flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEditLineProduct(item.productId)
                                  }
                                  className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Edit product"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveItem(item.productId)
                                  }
                                  className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  title="Remove from purchase"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col items-center justify-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <ShoppingCart className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">No products added yet</p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Search above to add products to this purchase
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium tracking-wider">
                    Grand Total
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">
                    ₹{totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleClose}
                    type="button"
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!supplierId || items.length === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Create Purchase
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <CreateProductModal
        isOpen={productFormOpen}
        onClose={handleCloseProductForm}
        onCreate={handleCreateProductFromModal}
        onUpdate={handleUpdateProductFromModal}
        editingProduct={productBeingEdited}
        existingCategories={productCategories}
        wrapperClassName="z-[60]"
      />
    </div>
  );
};

export default CreatePurchaseModal;
