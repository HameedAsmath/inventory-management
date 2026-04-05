"use client";

import {
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetProductsQuery,
  lowStockThreshold,
  type Product,
} from "../state/api";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Filter,
  X,
  Edit2,
} from "lucide-react";
import { useState, useMemo } from "react";
import Header from "@/app/(components)/Header";
import CreateProductModal from "./CreateProductModal";
import { toast } from "sonner";

const Products = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const {
    data: products,
    isLoading,
    isError,
  } = useGetProductsQuery(
    searchTerm || categoryFilter !== "all"
      ? { search: searchTerm, category: categoryFilter }
      : undefined,
  );

  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  const handleCreateProduct = async (productData: {
    name: string;
    price1: number;
    price2?: number;
    cp?: number;
    stockQuantity: number;
    lowStockQuantity: number;
    category?: string;
  }) => {
    try {
      await createProduct(productData).unwrap();
      toast.success("Product created successfully");
      setIsModalOpen(false);
    } catch {
      // error toast handled globally
    }
  };

  const handleUpdateProduct = async (
    productId: string,
    productData: {
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
      await updateProduct({ productId, data: productData }).unwrap();
      toast.success("Product updated successfully");
      setIsModalOpen(false);
      setEditingProduct(null);
    } catch {
      // error toast handled globally
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const toggleExpand = (productId: string) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  const categories = useMemo(() => {
    if (!products) return [];
    const uniqueCategories = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        uniqueCategories.add(p.category.trim());
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((product) => {
      if (categoryFilter === "all") return true;
      if (categoryFilter === "low-stock")
        return (
          product.stockQuantity > 0 &&
          product.stockQuantity < lowStockThreshold(product)
        );
      if (categoryFilter === "out-of-stock") return product.stockQuantity === 0;
      return product.category === categoryFilter;
    });
  }, [products, categoryFilter]);

  const getStockStatus = (product: Product) => {
    const threshold = lowStockThreshold(product);
    if (product.stockQuantity === 0) {
      return {
        label: "Out of Stock",
        color: "bg-red-50 text-red-700 border-red-200",
      };
    }
    if (product.stockQuantity < threshold) {
      return {
        label: "Low Stock",
        color: "bg-amber-50 text-amber-700 border-amber-200",
      };
    }
    return {
      label: "In Stock",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (isError || !products) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="rounded-full bg-red-100 p-4 mb-4">
          <Package className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-gray-600 font-medium">Failed to fetch products</p>
        <p className="text-sm text-gray-400 mt-1">
          Please check your connection and try again.
        </p>
      </div>
    );
  }

  const totalProducts = filteredProducts.length;
  const lowStockCount = filteredProducts.filter(
    (p) =>
      p.stockQuantity > 0 && p.stockQuantity < lowStockThreshold(p),
  ).length;
  const outOfStockCount = filteredProducts.filter(
    (p) => p.stockQuantity === 0,
  ).length;

  return (
    <div className="mx-auto pb-5 w-full">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <Header name="Products" />
          <p className="text-sm text-gray-500 mt-1">
            Manage your inventory and product catalog
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
          onClick={() => {
            setEditingProduct(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* SUMMARY STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-blue-50 p-3">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Total Products
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-amber-50 p-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Low Stock
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="shrink-0 rounded-lg bg-red-50 p-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {outOfStockCount}
            </p>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
              Out of Stock
            </p>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
          >
            <option value="all">All Categories</option>
            <option value="low-stock">Low Stock (below product threshold)</option>
            <option value="out-of-stock">Out of Stock</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PRODUCTS LIST */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="rounded-full bg-gray-100 p-5 mb-4">
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">
            No products found
          </p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {searchTerm || categoryFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by adding your first product"}
          </p>
          {!searchTerm && categoryFilter === "all" && (
            <button
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filteredProducts.map((product, index) => {
            const stockStatus = getStockStatus(product);
            const threshold = lowStockThreshold(product);
            const isLow =
              product.stockQuantity > 0 && product.stockQuantity < threshold;
            return (
              <div
                key={product.productId}
                className={index !== 0 ? "border-t border-gray-100" : ""}
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(product.productId)}
                  className={`w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors ${
                    product.stockQuantity === 0
                      ? "bg-red-50/30"
                      : isLow
                        ? "bg-amber-50/30"
                        : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                        product.stockQuantity === 0
                          ? "bg-red-100"
                          : isLow
                            ? "bg-amber-100"
                            : "bg-gradient-to-br from-blue-500 to-blue-600"
                      }`}
                    >
                      <Package
                        className={`w-4 h-4 ${
                          product.stockQuantity === 0 || isLow
                            ? "text-gray-700"
                            : "text-white"
                        }`}
                      />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {product.category && (
                          <>
                            <span className="text-xs text-gray-500">
                              {product.category}
                            </span>
                            <span className="text-gray-300">|</span>
                          </>
                        )}
                        <span
                          className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 border ${stockStatus.color}`}
                        >
                          {stockStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        ₹{product.price1.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {product.stockQuantity} units
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
                      {expandedProduct === product.productId ? (
                        <span className="text-gray-400 text-xs">−</span>
                      ) : (
                        <span className="text-gray-400 text-xs">+</span>
                      )}
                    </div>
                  </div>
                </button>

                {expandedProduct === product.productId && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-6 py-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                          Product Details
                        </h4>
                        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                              Product Name
                            </p>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              {product.name}
                            </p>
                          </div>
                          {product.category && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                Category
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {product.category}
                              </p>
                            </div>
                          )}
                          <div
                            className={`grid gap-3 ${product.price2 != null ? "grid-cols-2" : "grid-cols-1"}`}
                          >
                            <div>
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                Price 1
                              </p>
                              <p className="text-lg font-bold text-gray-900 mt-1">
                                ₹{product.price1.toFixed(2)}
                              </p>
                            </div>
                            {product.price2 != null && (
                              <div>
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                  Price 2
                                </p>
                                <p className="text-lg font-bold text-gray-900 mt-1">
                                  ₹{product.price2.toFixed(2)}
                                </p>
                              </div>
                            )}
                          </div>
                          {product.cp != null && (
                            <div>
                              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                                CP
                              </p>
                              <p className="text-lg font-bold text-gray-900 mt-1">
                                ₹{product.cp.toFixed(2)}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                              Stock Quantity
                            </p>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                              {product.stockQuantity} units
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                              Low stock threshold
                            </p>
                            <p className="text-lg font-bold text-gray-900 mt-1">
                              {threshold} units
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                          Stock Status
                        </h4>
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <div
                            className={`p-4 rounded-lg border ${stockStatus.color}`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {product.stockQuantity === 0 ? (
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                              ) : isLow ? (
                                <AlertTriangle className="w-5 h-5 text-amber-600" />
                              ) : (
                                <Package className="w-5 h-5 text-emerald-600" />
                              )}
                              <span className="font-semibold text-gray-900">
                                {stockStatus.label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {product.stockQuantity === 0
                                ? "This product is currently out of stock and needs immediate restocking."
                                : isLow
                                  ? `Stock is below your threshold (${threshold} units). Consider restocking soon.`
                                  : "Product is well stocked and ready for sale."}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleEditClick(product)}
                            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit Product
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <CreateProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onCreate={handleCreateProduct}
        onUpdate={handleUpdateProduct}
        editingProduct={editingProduct}
        existingCategories={categories}
      />
    </div>
  );
};

export default Products;
