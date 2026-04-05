"use client";

import { useGetProductsQuery, lowStockThreshold } from "../state/api";
import { Package, Loader2 } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";

const StockLevels = () => {
  const { data: products, isLoading, isError } = useGetProductsQuery();

  const stockStats = useMemo(() => {
    if (!products) return null;

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + p.stockQuantity, 0);
    const lowStock = products.filter(
      (p) =>
        p.stockQuantity > 0 && p.stockQuantity < lowStockThreshold(p),
    ).length;
    const outOfStock = products.filter((p) => p.stockQuantity === 0).length;
    const wellStocked = products.filter(
      (p) => p.stockQuantity >= lowStockThreshold(p),
    ).length;

    return {
      totalProducts,
      totalStock,
      lowStock,
      outOfStock,
      wellStocked,
    };
  }, [products]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !products) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[300px]">
        <p className="text-gray-500">Failed to load stock data</p>
      </div>
    );
  }

  const hasNoProducts = !products || products.length === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Stock Levels
            </h3>
            <p className="text-sm text-gray-500">
              {hasNoProducts ? "No products" : `${stockStats?.totalProducts || 0} products`}
            </p>
          </div>
        </div>
        {!hasNoProducts && (
          <Link
            href="/products"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View All →
          </Link>
        )}
      </div>

      {hasNoProducts ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <div className="p-3 bg-gray-50 rounded-full mb-3">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm font-medium">No products available</p>
          <p className="text-xs mt-1">Add products to track stock levels</p>
        </div>
      ) : stockStats ? (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Stock Units</span>
              <span className="text-lg font-bold text-blue-700">
                {stockStats.totalStock.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-emerald-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-emerald-700">
                {stockStats.wellStocked}
              </p>
              <p className="text-xs text-gray-600 mt-1">Well Stocked</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-amber-700">
                {stockStats.lowStock}
              </p>
              <p className="text-xs text-gray-600 mt-1">Low Stock</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-700">
                {stockStats.outOfStock}
              </p>
              <p className="text-xs text-gray-600 mt-1">Out of Stock</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default StockLevels;
