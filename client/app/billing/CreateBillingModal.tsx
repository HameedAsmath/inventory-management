"use client";

import React, { FormEvent, useState } from "react";
import {
  useGetCustomersQuery,
  useGetProductsQuery,
  type Product,
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
} from "lucide-react";
import { v4 } from "uuid";

type BillingItemInput = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  maxStock: number;
};

type CreateBillingData = {
  billingId: string;
  customerId: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
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
  const [error, setError] = useState("");

  const { data: customers } = useGetCustomersQuery(customerSearch);
  const { data: products } = useGetProductsQuery(productSearch);

  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

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

  const handleAddProduct = (product: Product) => {
    if (items.find((item) => item.productId === product.productId)) {
      setError(
        `${product.name} is already added. Adjust the quantity instead.`
      );
      setShowProductDropdown(false);
      setProductSearch("");
      return;
    }

    if (product.stockQuantity <= 0) {
      setError(`${product.name} is out of stock.`);
      setShowProductDropdown(false);
      setProductSearch("");
      return;
    }

    setItems([
      ...items,
      {
        productId: product.productId,
        productName: product.name,
        quantity: 1,
        price: product.price,
        maxStock: product.stockQuantity,
      },
    ]);
    setProductSearch("");
    setShowProductDropdown(false);
    setError("");
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter((item) => item.productId !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setItems(
      items.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Math.max(1, Math.min(quantity, item.maxStock)),
            }
          : item
      )
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

    const billingData: CreateBillingData = {
      billingId: `BILL-${v4().slice(0, 8).toUpperCase()}`,
      customerId,
      totalAmount,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
    };

    onCreate(billingData);
    resetForm();
  };

  const resetForm = () => {
    setCustomerId("");
    setSelectedCustomerName("");
    setCustomerSearch("");
    setItems([]);
    setError("");
    setProductSearch("");
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
        <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 mb-10">
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
                <div className="relative">
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
                            (i) => i.productId === product.productId
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
                                    ${product.price.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  product.stockQuantity <= 0
                                    ? "bg-red-50 text-red-600"
                                    : product.stockQuantity <= 5
                                    ? "bg-amber-50 text-amber-600"
                                    : "bg-emerald-50 text-emerald-600"
                                }`}
                              >
                                {product.stockQuantity <= 0
                                  ? "Out of stock"
                                  : `${product.stockQuantity} in stock`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
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
                            Subtotal
                          </th>
                          <th className="w-10 px-2 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr
                            key={item.productId}
                            className={
                              idx !== 0
                                ? "border-t border-gray-100"
                                : ""
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
                                      item.quantity - 1
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
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-12 py-1 text-center text-sm border-x border-gray-200 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuantityChange(
                                      item.productId,
                                      item.quantity + 1
                                    )
                                  }
                                  className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              ${item.price.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              ${(item.price * item.quantity).toFixed(2)}
                            </td>
                            <td className="px-2 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.productId)}
                                className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium tracking-wider">
                    Grand Total
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">
                    ${totalAmount.toFixed(2)}
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
    </div>
  );
};

export default CreateBillingModal;
