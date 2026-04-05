"use client";

import React, { FormEvent, useState, useEffect, useMemo } from "react";
import {
  useGetCustomersQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  type Product,
  lowStockThreshold,
} from "../state/api";
import {
  Plus,
  Trash2,
  Search,
  X,
  ShoppingCart,
  User,
  Package,
  CheckCircle2,
  Edit2,
} from "lucide-react";
import { v4 } from "uuid";
import { toast } from "sonner";
import CreateProductModal from "../products/CreateProductModal";

type BillingItemInput = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  price1: number;
  price2: number | null;
  selectedPriceType: "price1" | "price2";
  discountInput: string;
  maxStock: number;
};

function parseDiscount(input: string, gross: number): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;
  if (trimmed.endsWith("%")) {
    const pct = parseFloat(trimmed.slice(0, -1));
    if (isNaN(pct) || pct < 0) return 0;
    const clamped = Math.min(pct, 100);
    return Math.round(((gross * clamped) / 100) * 100) / 100;
  }
  const amt = parseFloat(trimmed);
  if (isNaN(amt) || amt < 0) return 0;
  return Math.min(amt, gross);
}

type CreateBillingData = {
  billingId: string;
  customerId: string;
  totalAmount: number;
  pnfCharges: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    discount: number;
  }>;
};

type CreateBillingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateBillingData) => void;
};

const CreateBillingModal = ({
  isOpen,
  onClose,
  onCreate,
}: CreateBillingModalProps) => {
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [items, setItems] = useState<BillingItemInput[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [pnfEnabled, setPnfEnabled] = useState(false);
  const [pnfAmount, setPnfAmount] = useState("");
  const [error, setError] = useState("");
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [productBeingEdited, setProductBeingEdited] = useState<Product | null>(
    null,
  );

  const { data: customers } = useGetCustomersQuery(customerSearch);
  const { data: products } = useGetProductsQuery({ search: productSearch });
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

  const itemsTotal = items.reduce((sum, item) => {
    const gross = item.price * item.quantity;
    const disc = parseDiscount(item.discountInput, gross);
    return sum + Math.max(0, gross - disc);
  }, 0);

  const pnfValue = pnfEnabled ? parseFloat(pnfAmount) || 0 : 0;
  const totalAmount = itemsTotal + pnfValue;

  const handleSelectCustomer = (id: string) => {
    setCustomerId(id);
    const customer = customers?.find((c) => c.customerId === id);
    setSelectedCustomerName(customer?.name || id);
    setCustomerSearch(customer?.name || id);
    setShowCustomerDropdown(false);
  };

  const handleClearCustomer = () => {
    setCustomerId("");
    setSelectedCustomerName("");
    setCustomerSearch("");
  };

  const handleAddProduct = (product: Product): boolean => {
    if (items.find((item) => item.productId === product.productId)) {
      setError(
        `${product.name} is already added. Adjust the quantity instead.`,
      );
      setShowProductDropdown(false);
      setProductSearch("");
      return false;
    }

    if (product.stockQuantity <= 0) {
      setError(`${product.name} is out of stock.`);
      setShowProductDropdown(false);
      setProductSearch("");
      return false;
    }

    setItems([
      ...items,
      {
        productId: product.productId,
        productName: product.name,
        quantity: 1,
        price: product.price1,
        price1: product.price1,
        price2: product.price2 ?? null,
        selectedPriceType: "price1",
        discountInput: "",
        maxStock: product.stockQuantity,
      },
    ]);
    setProductSearch("");
    setShowProductDropdown(false);
    setError("");
    return true;
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.productId !== productId));
  };

  const handlePriceTypeChange = (
    productId: string,
    priceType: "price1" | "price2",
  ) => {
    setItems(
      items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              selectedPriceType: priceType,
              price:
                priceType === "price1"
                  ? item.price1
                  : (item.price2 ?? item.price1),
            }
          : item,
      ),
    );
  };

  const handleDiscountChange = (productId: string, value: string) => {
    setItems(
      items.map((item) =>
        item.productId === productId ? { ...item, discountInput: value } : item,
      ),
    );
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Math.max(1, Math.min(quantity, item.maxStock)),
            }
          : item,
      ),
    );
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one product.");
      return;
    }

    const billingData = {
      customerId,
      totalAmount,
      pnfCharges: pnfValue,
      items: items.map((item) => {
        const gross = item.price * item.quantity;
        const discount = parseDiscount(item.discountInput, gross);
        return {
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          discount,
        };
      }),
    };

    const createData: CreateBillingData = {
      billingId: `BILL-${v4().slice(0, 8).toUpperCase()}`,
      ...billingData,
    };
    onCreate(createData);
    resetForm();
  };

  const resetForm = () => {
    setCustomerId("");
    setSelectedCustomerName("");
    setCustomerSearch("");
    setItems([]);
    setError("");
    setProductSearch("");
    setPnfEnabled(false);
    setPnfAmount("");
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

  const syncBillingLineFromProduct = (updated: Product) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== updated.productId) return item;
        const price2 = updated.price2 ?? null;
        const nextPrice =
          item.selectedPriceType === "price1"
            ? updated.price1
            : (price2 ?? updated.price1);
        return {
          ...item,
          productName: updated.name,
          price1: updated.price1,
          price2,
          price: nextPrice,
          maxStock: updated.stockQuantity,
          quantity: Math.max(
            1,
            Math.min(item.quantity, Math.max(updated.stockQuantity, 1)),
          ),
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
      syncBillingLineFromProduct(updated);
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
      {/* BACKDROP */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      {/* MODAL */}
      <div className="flex min-h-full items-start justify-center p-4 pt-10">
        <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 mb-10">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Create New Bill
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Select a customer and add products to generate an invoice
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

              {/* SECTION: CUSTOMER */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Customer
                  </h3>
                </div>

                {customerId ? (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedCustomerName}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {customerId}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCustomer}
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
                      placeholder="Search for a customer..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowCustomerDropdown(false), 200)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                    {showCustomerDropdown &&
                      customers &&
                      customers.length > 0 && (
                        <div className="absolute z-30 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1.5 max-h-48 overflow-y-auto">
                          {customers.map((customer) => (
                            <button
                              key={customer.customerId}
                              type="button"
                              onClick={() =>
                                handleSelectCustomer(customer.customerId)
                              }
                              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-3 border-b border-gray-50 last:border-b-0 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                                <span className="text-xs font-semibold text-gray-600">
                                  {customer.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">
                                  {customer.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {customer.customerId}
                                  {customer.email && ` · ${customer.email}`}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                )}
              </div>

              {/* SECTION: PRODUCTS */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800">
                    Products
                  </h3>
                </div>

                {/* SEARCH PRODUCTS */}
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
                      <div className="absolute z-30 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1.5 max-h-48 overflow-y-auto">
                        {products.map((product) => {
                          const alreadyAdded = items.some(
                            (i) => i.productId === product.productId,
                          );
                          const lowTh = lowStockThreshold(product);
                          const isLowStock =
                            product.stockQuantity > 0 &&
                            product.stockQuantity < lowTh;
                          return (
                            <button
                              key={product.productId}
                              type="button"
                              onClick={() => handleAddProduct(product)}
                              disabled={alreadyAdded}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-gray-50 last:border-b-0 transition-colors ${
                                alreadyAdded
                                  ? "bg-gray-50 opacity-50 cursor-not-allowed"
                                  : product.stockQuantity <= 0
                                    ? "opacity-50"
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
                                    {alreadyAdded && (
                                      <span className="ml-2 text-xs text-gray-400">
                                        (added)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    ₹{product.price1.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  product.stockQuantity <= 0
                                    ? "bg-red-50 text-red-600"
                                    : isLowStock
                                      ? "bg-amber-50 text-amber-600"
                                      : "bg-emerald-50 text-emerald-600"
                                }`}
                              >
                                {product.stockQuantity <= 0
                                  ? "Out of stock"
                                  : isLowStock
                                    ? `Low (${product.stockQuantity} < ${lowTh})`
                                    : `${product.stockQuantity} in stock`}
                              </span>
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

                {/* ITEMS TABLE */}
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
                            Price
                          </th>
                          <th className="text-right px-4 py-2.5 text-gray-600 font-medium text-xs uppercase tracking-wider">
                            Discount
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
                            className={
                              idx !== 0 ? "border-t border-gray-100" : ""
                            }
                          >
                            <td className="px-4 py-3">
                              <p className="text-gray-800 font-medium">
                                {item.productName}
                              </p>
                              <p className="text-xs text-gray-400">
                                Stock: {item.maxStock}
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
                                  max={item.maxStock}
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
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-end gap-1">
                                {item.price2 != null ? (
                                  <select
                                    value={item.selectedPriceType}
                                    onChange={(e) =>
                                      handlePriceTypeChange(
                                        item.productId,
                                        e.target.value as "price1" | "price2",
                                      )
                                    }
                                    className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="price1">price 1</option>
                                    <option value="price2">price 2</option>
                                  </select>
                                ) : (
                                  <span className="text-xs text-gray-400">
                                    price 1
                                  </span>
                                )}
                                <span className="text-sm text-gray-700 font-medium">
                                  ₹{item.price.toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <input
                                type="text"
                                placeholder="0"
                                value={item.discountInput}
                                onChange={(e) =>
                                  handleDiscountChange(
                                    item.productId,
                                    e.target.value,
                                  )
                                }
                                className="w-20 text-right text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300"
                                title="Enter amount (e.g. 50) or percentage (e.g. 10%)"
                              />
                              {(() => {
                                const gross = item.price * item.quantity;
                                const disc = parseDiscount(
                                  item.discountInput,
                                  gross,
                                );
                                return disc > 0 ? (
                                  <p className="text-xs text-red-500 mt-0.5">
                                    −₹{disc.toFixed(2)}
                                  </p>
                                ) : null;
                              })()}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {(() => {
                                const gross = item.price * item.quantity;
                                const disc = parseDiscount(
                                  item.discountInput,
                                  gross,
                                );
                                const sub = Math.max(0, gross - disc);
                                return (
                                  <>
                                    {disc > 0 && (
                                      <span className="text-xs text-gray-400 line-through mr-1">
                                        ₹{gross.toFixed(2)}
                                      </span>
                                    )}
                                    ₹{sub.toFixed(2)}
                                  </>
                                );
                              })()}
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
                                  title="Remove from bill"
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
                    <p className="text-sm text-gray-400">
                      No products added yet
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      Search above to add products to the bill
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* FOOTER */}
            <div className="border-t border-gray-100 px-6 py-4 space-y-4">
              {/* P&F CHARGES */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={pnfEnabled}
                    onChange={(e) => {
                      setPnfEnabled(e.target.checked);
                      if (!e.target.checked) setPnfAmount("");
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    P&F Charges
                  </span>
                </label>
                {pnfEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={pnfAmount}
                      onChange={(e) => setPnfAmount(e.target.value)}
                      className="w-28 text-right text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div>
                  {pnfEnabled && pnfValue > 0 && (
                    <p className="text-xs text-gray-400 mb-0.5">
                      Items: ₹{itemsTotal.toFixed(2)} + P&F: ₹
                      {pnfValue.toFixed(2)}
                    </p>
                  )}
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
                    disabled={!customerId || items.length === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Create Bill
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

export default CreateBillingModal;
