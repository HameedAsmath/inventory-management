"use client";

import React, {
  FormEvent,
  useState,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  useGetCustomersQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  type Billing,
  type Product,
  type UpdateBillingRequest,
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

type PriceType = "price1" | "price2" | "custom";

type BillingItemInput = {
  productId: string;
  productName: string;
  quantityInput: string;
  price: number;
  price1: number;
  price2: number | null;
  selectedPriceType: PriceType;
  customPriceInput: string;
  discountInput: string;
  maxStock: number;
};

/**
 * Parses the discount input as a PER-UNIT discount and returns the total
 * line discount (per-unit * qty), capped so the line can't go negative.
 * - "50"   → ₹50 off each unit  → line discount = 50 * qty
 * - "10%"  → 10% off each unit  → line discount = 10% of (unitPrice * qty)
 */
function parseLineDiscount(
  input: string,
  unitPrice: number,
  qty: number,
): number {
  const trimmed = input.trim();
  if (!trimmed || qty <= 0 || unitPrice <= 0) return 0;
  const gross = unitPrice * qty;
  if (trimmed.endsWith("%")) {
    const pct = parseFloat(trimmed.slice(0, -1));
    if (isNaN(pct) || pct < 0) return 0;
    const clamped = Math.min(pct, 100);
    return Math.round(((gross * clamped) / 100) * 100) / 100;
  }
  const perUnit = parseFloat(trimmed);
  if (isNaN(perUnit) || perUnit < 0) return 0;
  const cappedPerUnit = Math.min(perUnit, unitPrice);
  return Math.round(cappedPerUnit * qty * 100) / 100;
}

function parsePriceInput(raw: string): number {
  const n = parseFloat(raw.trim());
  if (isNaN(n) || n < 0) return 0;
  return n;
}

/** Qty used for line totals while typing: empty / invalid → 0; capped at maxStock. */
function quantityForPricing(qtyInput: string, maxStock: number): number {
  const t = qtyInput.trim();
  if (t === "") return 0;
  const n = parseInt(t, 10);
  if (isNaN(n) || n < 0) return 0;
  return Math.min(n, maxStock);
}

function isValidBillQuantity(qtyInput: string, maxStock: number): boolean {
  const t = qtyInput.trim();
  if (t === "") return false;
  const n = parseInt(t, 10);
  if (isNaN(n) || n < 1) return false;
  if (maxStock < 1) return false;
  if (n > maxStock) return false;
  return true;
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
  editingBilling?: Billing | null;
  onUpdate?: (billingId: string, data: UpdateBillingRequest) => Promise<void>;
};

const CreateBillingModal = ({
  isOpen,
  onClose,
  onCreate,
  editingBilling = null,
  onUpdate,
}: CreateBillingModalProps) => {
  const isEditMode = Boolean(editingBilling?.billingId);
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [items, setItems] = useState<BillingItemInput[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [productHighlightIndex, setProductHighlightIndex] = useState(-1);
  const productHighlightRef = useRef<HTMLButtonElement | null>(null);
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

  const searchedProducts = useMemo(() => {
    if (!products) return [];
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    const scoreProduct = (p: Product): number => {
      const name = p.name.toLowerCase();
      const serial = (p.serialNumber ?? "").toLowerCase();

      if (serial === term) return 0;
      if (serial.startsWith(term)) return 1;
      if (serial.includes(term)) return 2;
      if (name === term) return 3;
      if (name.startsWith(term)) return 4;
      if (name.includes(term)) return 5;
      return 99;
    };

    return products
      .map((p, idx) => ({ p, idx, score: scoreProduct(p) }))
      .filter((x) => x.score < 99)
      .sort((a, b) => a.score - b.score || a.idx - b.idx)
      .map((x) => x.p);
  }, [products, productSearch]);

  /** Indices in `products` that can be chosen from the keyboard (in stock, not on bill). */
  const billingSelectableProductIndices = useMemo(() => {
    if (!searchedProducts?.length) return [];
    const out: number[] = [];
    searchedProducts.forEach((p, i) => {
      if (items.some((x) => x.productId === p.productId)) return;
      if (p.stockQuantity <= 0) return;
      out.push(i);
    });
    return out;
  }, [searchedProducts, items]);

  const productDropdownOpen =
    showProductDropdown &&
    Boolean(productSearch?.trim()) &&
    Boolean(searchedProducts?.length);

  const activeProductDropdownIndex = useMemo(() => {
    const indices = billingSelectableProductIndices;
    if (!indices.length) return -1;
    if (productHighlightIndex >= 0 && indices.includes(productHighlightIndex)) {
      return productHighlightIndex;
    }
    return indices[0];
  }, [billingSelectableProductIndices, productHighlightIndex]);

  useEffect(() => {
    if (activeProductDropdownIndex >= 0) {
      productHighlightRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [activeProductDropdownIndex]);

  const itemsTotal = items.reduce((sum, item) => {
    const q = quantityForPricing(item.quantityInput, item.maxStock);
    const gross = item.price * q;
    const disc = parseLineDiscount(item.discountInput, item.price, q);
    return sum + Math.max(0, gross - disc);
  }, 0);

  const allLineQuantitiesValid = useMemo(
    () =>
      items.length > 0 &&
      items.every((item) =>
        isValidBillQuantity(item.quantityInput, item.maxStock),
      ),
    [items],
  );

  const allLinePricesValid = useMemo(
    () =>
      items.every(
        (item) => item.selectedPriceType !== "custom" || item.price > 0,
      ),
    [items],
  );

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
        quantityInput: "1",
        price: product.price1,
        price1: product.price1,
        price2: product.price2 ?? null,
        selectedPriceType: "price1",
        customPriceInput: "",
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

  const handlePriceTypeChange = (productId: string, priceType: PriceType) => {
    setItems(
      items.map((item) => {
        if (item.productId !== productId) return item;
        if (priceType === "custom") {
          // Seed the custom input with the current price if empty, so users
          // can tweak rather than start from scratch.
          const seed =
            item.customPriceInput.trim() !== ""
              ? item.customPriceInput
              : String(item.price);
          return {
            ...item,
            selectedPriceType: "custom",
            customPriceInput: seed,
            price: parsePriceInput(seed),
          };
        }
        return {
          ...item,
          selectedPriceType: priceType,
          price:
            priceType === "price1"
              ? item.price1
              : (item.price2 ?? item.price1),
        };
      }),
    );
  };

  const handleCustomPriceChange = (productId: string, value: string) => {
    setItems(
      items.map((item) => {
        if (item.productId !== productId) return item;
        return {
          ...item,
          customPriceInput: value,
          price: parsePriceInput(value),
        };
      }),
    );
  };

  const handleDiscountChange = (productId: string, value: string) => {
    setItems(
      items.map((item) =>
        item.productId === productId ? { ...item, discountInput: value } : item,
      ),
    );
  };

  const handleQuantityInputChange = (productId: string, value: string) => {
    if (value !== "" && !/^\d+$/.test(value)) return;
    setItems(
      items.map((item) => {
        if (item.productId !== productId) return item;
        if (value === "") return { ...item, quantityInput: "" };
        const n = parseInt(value, 10);
        if (isNaN(n)) return { ...item, quantityInput: value };
        const limit = Math.max(item.maxStock, 0);
        const capped = Math.min(n, limit);
        return { ...item, quantityInput: String(capped) };
      }),
    );
  };

  const handleQuantityStep = (productId: string, delta: number) => {
    setItems(
      items.map((item) => {
        if (item.productId !== productId) return item;
        const t = item.quantityInput.trim();
        const cur = t === "" ? 0 : parseInt(t, 10);
        const base = t === "" || isNaN(cur) ? 0 : cur;
        const next = Math.max(0, Math.min(base + delta, item.maxStock));
        return { ...item, quantityInput: String(next) };
      }),
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
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

    for (const item of items) {
      if (!isValidBillQuantity(item.quantityInput, item.maxStock)) {
        setError(
          `Quantity for ${item.productName} must be between 1 and ${item.maxStock} (available stock).`,
        );
        return;
      }
      if (item.selectedPriceType === "custom" && item.price <= 0) {
        setError(
          `Enter a valid custom price for ${item.productName} (greater than 0).`,
        );
        return;
      }
    }

    const linePayload = items.map((item) => {
      const qty = parseInt(item.quantityInput.trim(), 10);
      const discount = parseLineDiscount(item.discountInput, item.price, qty);
      return {
        productId: item.productId,
        quantity: qty,
        price: item.price,
        discount,
      };
    });

    if (isEditMode && editingBilling && onUpdate) {
      const updatePayload: UpdateBillingRequest = {
        totalAmount,
        pnfCharges: pnfValue,
        items: linePayload,
      };
      try {
        await onUpdate(editingBilling.billingId, updatePayload);
        resetForm();
        onClose();
      } catch {
        /* error toast from global handler */
      }
      return;
    }

    const createData: CreateBillingData = {
      billingId: `BILL-${v4().slice(0, 8).toUpperCase()}`,
      customerId,
      totalAmount,
      pnfCharges: pnfValue,
      items: linePayload,
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
    setProductHighlightIndex(-1);
    setPnfEnabled(false);
    setPnfAmount("");
    setProductFormOpen(false);
    setProductBeingEdited(null);
  };

  /* Populate form when opening create vs edit (editingBilling identity). */
  useEffect(() => {
    if (!isOpen) return;
    if (editingBilling) {
      setCustomerId(editingBilling.customer.customerId);
      setSelectedCustomerName(editingBilling.customer.name);
      setCustomerSearch(editingBilling.customer.name);
      setPnfEnabled(editingBilling.pnfCharges > 0);
      setPnfAmount(
        editingBilling.pnfCharges > 0 ? String(editingBilling.pnfCharges) : "",
      );
      setItems(
        editingBilling.BillingItem.map((line) => {
          const p = line.product;
          const price2 = p.price2 ?? null;
          const isP1 = Math.abs(line.price - p.price1) < 0.01;
          const isP2 = price2 != null && Math.abs(line.price - price2) < 0.01;
          const selectedPriceType: PriceType = isP1
            ? "price1"
            : isP2
              ? "price2"
              : "custom";
          const customPriceInput =
            selectedPriceType === "custom" ? String(line.price) : "";
          const maxStock = (p.stockQuantity ?? 0) + line.quantity;
          // Stored discount is the total line discount. Convert back to per-unit
          // for the input so current bills keep the same numbers on save.
          const perUnit =
            line.quantity > 0 ? line.discount / line.quantity : 0;
          const disc =
            perUnit > 0
              ? Number.isInteger(perUnit)
                ? String(perUnit)
                : perUnit.toFixed(2)
              : "";
          return {
            productId: line.productId,
            productName: p.name,
            quantityInput: String(line.quantity),
            price: line.price,
            price1: p.price1,
            price2,
            selectedPriceType,
            customPriceInput,
            discountInput: disc,
            maxStock,
          };
        }),
      );
      setError("");
      setProductSearch("");
      setProductHighlightIndex(-1);
      setShowProductDropdown(false);
      setProductFormOpen(false);
      setProductBeingEdited(null);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: reset when switching create/edit by billingId only
  }, [isOpen, editingBilling?.billingId]);

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
        let nextPrice: number;
        if (item.selectedPriceType === "custom") {
          nextPrice = parsePriceInput(item.customPriceInput);
        } else if (item.selectedPriceType === "price2") {
          nextPrice = price2 ?? updated.price1;
        } else {
          nextPrice = updated.price1;
        }
        const prev = parseInt(item.quantityInput.trim(), 10);
        const safePrev =
          item.quantityInput.trim() === "" || isNaN(prev) ? 1 : prev;
        const nextQty = Math.max(
          1,
          Math.min(safePrev, Math.max(updated.stockQuantity, 1)),
        );
        return {
          ...item,
          productName: updated.name,
          price1: updated.price1,
          price2,
          price: nextPrice,
          maxStock: updated.stockQuantity,
          quantityInput: String(nextQty),
        };
      }),
    );
  };

  const handleCreateProductFromModal = async (formData: {
    serialNumber?: string;
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
      serialNumber?: string;
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
      const updated = await updateProduct({
        productId,
        data: formData,
      }).unwrap();
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

  const handleProductSearchKeyDown = (
    e: ReactKeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setShowProductDropdown(false);
      return;
    }
    if (!productDropdownOpen || !searchedProducts?.length) return;

    const indices = billingSelectableProductIndices;
    const active =
      productHighlightIndex >= 0 && indices.includes(productHighlightIndex)
        ? productHighlightIndex
        : (indices[0] ?? -1);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!indices.length) return;
      const pos = indices.indexOf(active);
      const next = pos < 0 ? 0 : (pos + 1) % indices.length;
      setProductHighlightIndex(indices[next]);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!indices.length) return;
      const pos = indices.indexOf(active);
      const next = pos <= 0 ? indices.length - 1 : pos - 1;
      setProductHighlightIndex(indices[next]);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && indices.includes(active)) {
        handleAddProduct(searchedProducts[active]);
      }
    }
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
                {isEditMode ? "Edit Bill" : "Create New Bill"}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {isEditMode
                  ? `${editingBilling?.billingId} — customer cannot be changed`
                  : "Select a customer and add products to generate an invoice"}
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
                    {!isEditMode && (
                      <button
                        type="button"
                        onClick={handleClearCustomer}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-blue-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                        setProductHighlightIndex(-1);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() =>
                        setTimeout(() => setShowProductDropdown(false), 200)
                      }
                      onKeyDown={handleProductSearchKeyDown}
                      autoComplete="off"
                      className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                    {productDropdownOpen && searchedProducts && (
                      <div
                        className="absolute z-30 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1.5 max-h-48 overflow-y-auto"
                        role="listbox"
                        aria-label="Product search results"
                      >
                        {searchedProducts.map((product, idx) => {
                          const alreadyAdded = items.some(
                            (i) => i.productId === product.productId,
                          );
                          const lowTh = lowStockThreshold(product);
                          const isLowStock =
                            product.stockQuantity > 0 &&
                            product.stockQuantity < lowTh;
                          const isHighlighted =
                            activeProductDropdownIndex === idx;
                          return (
                            <button
                              key={product.productId}
                              ref={isHighlighted ? productHighlightRef : null}
                              type="button"
                              role="option"
                              aria-selected={isHighlighted}
                              onMouseEnter={() => {
                                if (
                                  !alreadyAdded &&
                                  product.stockQuantity > 0
                                ) {
                                  setProductHighlightIndex(idx);
                                }
                              }}
                              onClick={() => handleAddProduct(product)}
                              disabled={alreadyAdded}
                              className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between border-b border-gray-50 last:border-b-0 transition-colors ${
                                alreadyAdded
                                  ? "bg-gray-50 opacity-50 cursor-not-allowed"
                                  : product.stockQuantity <= 0
                                    ? "opacity-50"
                                    : isHighlighted
                                      ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
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
                                    {product.serialNumber
                                      ? `SN: ${product.serialNumber} · `
                                      : ""}
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
                  <div className="mt-4 bg-white rounded-lg border border-gray-200 max-h-[270px] overflow-y-auto">
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
                                    handleQuantityStep(item.productId, -1)
                                  }
                                  className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors text-xs font-bold"
                                >
                                  -
                                </button>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="off"
                                  maxLength={8}
                                  aria-label="Quantity"
                                  value={item.quantityInput}
                                  onChange={(e) =>
                                    handleQuantityInputChange(
                                      item.productId,
                                      e.target.value,
                                    )
                                  }
                                  className="w-12 py-1 text-center text-sm border-x border-gray-200 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuantityStep(item.productId, 1)
                                  }
                                  className="px-2 py-1 text-gray-500 hover:bg-gray-100 transition-colors text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-end gap-1">
                                <select
                                  value={item.selectedPriceType}
                                  onChange={(e) =>
                                    handlePriceTypeChange(
                                      item.productId,
                                      e.target.value as PriceType,
                                    )
                                  }
                                  className="w-20 text-xs border border-gray-200 rounded-md px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="price1">price 1</option>
                                  {item.price2 != null && (
                                    <option value="price2">price 2</option>
                                  )}
                                  <option value="custom">custom</option>
                                </select>
                                {item.selectedPriceType === "custom" ? (
                                  <div className="relative">
                                    <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                      ₹
                                    </span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      autoComplete="off"
                                      placeholder="0.00"
                                      value={item.customPriceInput}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (v !== "" && !/^\d*\.?\d*$/.test(v))
                                          return;
                                        handleCustomPriceChange(
                                          item.productId,
                                          v,
                                        );
                                      }}
                                      aria-label="Custom price"
                                      className="w-20 text-right text-xs font-medium text-gray-700 border border-gray-200 rounded-md pl-4 pr-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-300"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-700 font-medium">
                                    ₹{item.price.toFixed(2)}
                                  </span>
                                )}
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
                                title="Per-unit discount. Enter amount (e.g. 50) or percentage (e.g. 10%)"
                              />
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                per unit
                              </p>
                              {(() => {
                                const q = quantityForPricing(
                                  item.quantityInput,
                                  item.maxStock,
                                );
                                const disc = parseLineDiscount(
                                  item.discountInput,
                                  item.price,
                                  q,
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
                                const q = quantityForPricing(
                                  item.quantityInput,
                                  item.maxStock,
                                );
                                const gross = item.price * q;
                                const disc = parseLineDiscount(
                                  item.discountInput,
                                  item.price,
                                  q,
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
                    disabled={
                      !customerId ||
                      items.length === 0 ||
                      !allLineQuantitiesValid ||
                      !allLinePricesValid
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:hover:shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {isEditMode ? "Save changes" : "Create Bill"}
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
