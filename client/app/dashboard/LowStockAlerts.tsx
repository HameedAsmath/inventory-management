"use client";

import { useGetProductsQuery, lowStockThreshold } from "../state/api";
import { AlertTriangle, Package, Loader2 } from "lucide-react";
import Link from "next/link";

const LowStockAlerts = () => {
  const { data: products, isLoading, isError } = useGetProductsQuery();

  const lowStockProducts =
    products
      ?.filter(
        (product) =>
          product.stockQuantity < lowStockThreshold(product),
      )
      .sort((a, b) => a.stockQuantity - b.stockQuantity)
      .slice(0, 5) || [];

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
  const totalLowStock =
    products?.filter((p) => p.stockQuantity < lowStockThreshold(p)).length || 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Low Stock Alerts
            </h3>
            <p className="text-sm text-gray-500">
              {hasNoProducts 
                ? "No products yet" 
                : `${totalLowStock} ${totalLowStock === 1 ? "item" : "items"} need restocking`}
            </p>
          </div>
        </div>
        {totalLowStock > 0 && (
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
      ) : lowStockProducts.length > 0 ? (
        <div className="space-y-3">
          {lowStockProducts.map((product) => {
            const threshold = lowStockThreshold(product);
            const isCritical =
              product.stockQuantity === 0 ||
              product.stockQuantity < Math.max(1, Math.ceil(threshold / 2));
            return (
              <div
                key={product.productId}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isCritical
                    ? "bg-red-50 border-red-200"
                    : "bg-amber-50 border-amber-200"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`p-2 rounded-lg ${
                      isCritical ? "bg-red-100" : "bg-amber-100"
                    }`}
                  >
                    <Package
                      className={`w-4 h-4 ${
                        isCritical ? "text-red-600" : "text-amber-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.stockQuantity} units (threshold {threshold})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isCritical
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isCritical ? "Critical" : "Low"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <div className="p-3 bg-green-50 rounded-full mb-3">
            <Package className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-sm font-medium">All products well stocked</p>
          <p className="text-xs mt-1">No low stock alerts</p>
        </div>
      )}
    </div>
  );
};

export default LowStockAlerts;
