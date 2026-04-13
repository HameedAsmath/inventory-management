"use client";

import React, { FormEvent, useState, useRef } from "react";
import { Plus, X, Package, DollarSign, Boxes, Tag, Edit2 } from "lucide-react";
import { type Product, DEFAULT_LOW_STOCK_QUANTITY } from "../state/api";

type ProductFormData = {
  serialNumber?: string;
  name: string;
  price1: number;
  price2?: number;
  cp?: number;
  stockQuantity: number;
  lowStockQuantity: number;
  category?: string;
};

type CreateProductModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (formData: ProductFormData) => void;
  onUpdate?: (productId: string, formData: ProductFormData) => void;
  editingProduct?: Product | null;
  existingCategories?: string[];
  /** e.g. z-[60] when stacking above another z-50 modal */
  wrapperClassName?: string;
};

const CreateProductModal = ({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  editingProduct,
  existingCategories = [],
  wrapperClassName = "z-50",
}: CreateProductModalProps) => {
  const [name, setName] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [price1, setPrice1] = useState("");
  const [price2, setPrice2] = useState("");
  const [cp, setCp] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [lowStockQuantity, setLowStockQuantity] = useState(
    String(DEFAULT_LOW_STOCK_QUANTITY),
  );
  const [category, setCategory] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [error, setError] = useState("");

  const isEditing = !!editingProduct;

  const resetForm = () => {
    setName("");
    setSerialNumber("");
    setPrice1("");
    setPrice2("");
    setCp("");
    setStockQuantity("");
    setLowStockQuantity(String(DEFAULT_LOW_STOCK_QUANTITY));
    setCategory("");
    setCategoryInput("");
    setError("");
  };

  const prevKeyRef = useRef<string | null>(null);
  const editingKey =
    isOpen && editingProduct
      ? editingProduct.productId
      : isOpen
        ? "__new__"
        : null;
  if (editingKey !== prevKeyRef.current) {
    prevKeyRef.current = editingKey;
    if (editingProduct && isOpen) {
      setName(editingProduct.name);
      setSerialNumber(editingProduct.serialNumber ?? "");
      setPrice1(String(editingProduct.price1));
      setPrice2(
        editingProduct.price2 != null ? String(editingProduct.price2) : "",
      );
      setCp(editingProduct.cp != null ? String(editingProduct.cp) : "");
      setStockQuantity(String(editingProduct.stockQuantity));
      setLowStockQuantity(
        String(editingProduct.lowStockQuantity ?? DEFAULT_LOW_STOCK_QUANTITY),
      );
      setCategory(editingProduct.category || "");
      setCategoryInput(editingProduct.category || "");
      setError("");
    } else {
      resetForm();
    }
  }

  const handleCategorySelect = (selectedCategory: string) => {
    setCategory(selectedCategory);
    setCategoryInput(selectedCategory);
    setShowCategoryDropdown(false);
  };

  const handleCategoryInputChange = (value: string) => {
    setCategoryInput(value);
    setCategory(value);
    setShowCategoryDropdown(true);
  };

  const filteredCategories = existingCategories.filter((cat) =>
    cat.toLowerCase().includes(categoryInput.toLowerCase()),
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (serialNumber.trim() && serialNumber.trim().length < 3) {
      setError("Serial number must be at least 3 characters.");
      return;
    }

    const price1Num = parseFloat(price1);
    if (!price1 || isNaN(price1Num) || price1Num <= 0) {
      setError("Price 1 must be a positive number.");
      return;
    }

    let price2Num: number | undefined;
    if (price2.trim()) {
      price2Num = parseFloat(price2);
      if (isNaN(price2Num) || price2Num <= 0) {
        setError("Price 2 must be a positive number.");
        return;
      }
      if (price2Num >= price1Num) {
        setError("Price 2 must be less than price 1.");
        return;
      }
    }

    let cpNum: number | undefined;
    if (cp.trim()) {
      cpNum = parseFloat(cp);
      if (isNaN(cpNum) || cpNum < 0) {
        setError("CP must be a non-negative number.");
        return;
      }
      if (cpNum >= price1Num) {
        setError("Cost price must be less than price 1.");
        return;
      }
      if (price2Num !== undefined && cpNum >= price2Num) {
        setError("Cost price must be less than price 2.");
        return;
      }
    }

    const stockNum = parseInt(stockQuantity, 10);
    if (!stockQuantity || isNaN(stockNum) || stockNum < 0) {
      setError("Stock quantity must be a non-negative number.");
      return;
    }

    const lowStockNum = parseInt(lowStockQuantity, 10);
    if (!lowStockQuantity.trim() || isNaN(lowStockNum) || lowStockNum < 0) {
      setError("Low stock quantity must be a non-negative integer.");
      return;
    }

    const formData: ProductFormData = {
      ...(serialNumber.trim() && { serialNumber: serialNumber.trim() }),
      name: name.trim(),
      price1: price1Num,
      ...(price2Num !== undefined && { price2: price2Num }),
      ...(cpNum !== undefined && { cp: cpNum }),
      stockQuantity: stockNum,
      lowStockQuantity: lowStockNum,
      category: category.trim() || undefined,
    };

    if (isEditing && onUpdate) {
      onUpdate(editingProduct.productId, formData);
    } else {
      onCreate(formData);
    }
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${wrapperClassName} overflow-y-auto`}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="flex min-h-full items-start justify-center p-4 pt-10">
        <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5 mb-10">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditing ? "Edit Product" : "Add New Product"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEditing
                  ? "Update the product details"
                  : "Fill in the details to add a new product"}
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
            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SERIAL NUMBER */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <label
                      htmlFor="serialNumber"
                      className="text-sm font-semibold text-gray-800"
                    >
                      Serial Number
                    </label>
                  </div>
                  <input
                    id="serialNumber"
                    type="text"
                    minLength={3}
                    placeholder="Unique serial (optional)"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                </div>

                {/* PRODUCT NAME */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <Package className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <label
                      htmlFor="name"
                      className="text-sm font-semibold text-gray-800"
                    >
                      Product Name <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    id="name"
                    type="text"
                    placeholder="Enter product name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    required
                  />
                </div>
              </div>

              {/* CATEGORY */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <Tag className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <label
                    htmlFor="category"
                    className="text-sm font-semibold text-gray-800"
                  >
                    Category
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="category"
                    type="text"
                    placeholder="Enter or select category (optional)"
                    value={categoryInput}
                    onChange={(e) => handleCategoryInputChange(e.target.value)}
                    onFocus={() => setShowCategoryDropdown(true)}
                    onBlur={() =>
                      setTimeout(() => setShowCategoryDropdown(false), 200)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                  {showCategoryDropdown &&
                    filteredCategories.length > 0 &&
                    categoryInput && (
                      <div className="absolute z-30 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1.5 max-h-48 overflow-y-auto">
                        {filteredCategories.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleCategorySelect(cat)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-2 border-b border-gray-50 last:border-b-0 transition-colors"
                          >
                            <Tag className="w-4 h-4 text-gray-400" />
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  {categoryInput && filteredCategories.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Press Enter to create new category: &quot;{categoryInput}
                      &quot;
                    </p>
                  )}
                </div>
              </div>

              {/* PRICES + CP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <label
                      htmlFor="price1"
                      className="text-sm font-semibold text-gray-800"
                    >
                      Price 1 <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    id="price1"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={price1}
                    onChange={(e) => setPrice1(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <label
                      htmlFor="price2"
                      className="text-sm font-semibold text-gray-800"
                    >
                      Price 2
                    </label>
                  </div>
                  <input
                    id="price2"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00 (optional)"
                    value={price2}
                    onChange={(e) => setPrice2(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp"
                    className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"
                  >
                    <span className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5 text-rose-600" />
                    </span>
                    CP
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="cp"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00 (optional)"
                      value={cp}
                      onChange={(e) => setCp(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>
              </div>

              {/* STOCK CONFIG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                      <Boxes className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <label
                      htmlFor="stockQuantity"
                      className="text-sm font-semibold text-gray-800"
                    >
                      Stock Quantity <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    id="stockQuantity"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    required
                  />
                </div>

                {/* LOW STOCK THRESHOLD */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                      <Boxes className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <label
                      htmlFor="lowStockQuantity"
                      className="text-sm font-semibold text-gray-800"
                    >
                      Low stock threshold{" "}
                      <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    id="lowStockQuantity"
                    type="number"
                    min="0"
                    step="1"
                    placeholder={String(DEFAULT_LOW_STOCK_QUANTITY)}
                    value={lowStockQuantity}
                    onChange={(e) => setLowStockQuantity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white py-2.5 px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1.5">
                    Alerts when on-hand quantity is below this level (default{" "}
                    {DEFAULT_LOW_STOCK_QUANTITY}).
                  </p>
                </div>
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
                  disabled={
                    !name.trim() ||
                    !price1 ||
                    !stockQuantity ||
                    !lowStockQuantity.trim()
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-sm"
                >
                  {isEditing ? (
                    <>
                      <Edit2 className="w-4 h-4" />
                      Update Product
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Product
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

export default CreateProductModal;
