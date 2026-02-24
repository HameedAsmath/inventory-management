"use client";

import { useGetBillingsQuery } from "../state/api";
import { Package, TrendingUp, Loader2, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";

type ProductSalesData = {
  productId: string;
  productName: string;
  totalRevenue: number;
  totalQuantity: number;
  orderCount: number;
};

const ProductSalesReport = () => {
  const { data: billings, isLoading, isError } = useGetBillingsQuery();

  const productSales = useMemo(() => {
    if (!billings) return [];

    const productMap = new Map<string, ProductSalesData>();

    billings
      .filter((b) => b.paymentStatus === "success")
      .forEach((billing) => {
        billing.BillingItem.forEach((item) => {
          const existing = productMap.get(item.productId);
          if (existing) {
            existing.totalRevenue += item.subtotal;
            existing.totalQuantity += item.quantity;
            existing.orderCount += 1;
          } else {
            productMap.set(item.productId, {
              productId: item.productId,
              productName: item.product.name,
              totalRevenue: item.subtotal,
              totalQuantity: item.quantity,
              orderCount: 1,
            });
          }
        });
      });

    return Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5); // Top 5 products
  }, [billings]);

  const totalProductRevenue = useMemo(() => {
    return productSales.reduce((sum, p) => sum + p.totalRevenue, 0);
  }, [productSales]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError || !billings) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center h-[400px]">
        <p className="text-gray-500">Failed to load product sales data</p>
      </div>
    );
  }

  const hasNoData = !billings || billings.length === 0 || productSales.length === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Top Products by Sales
            </h3>
            <p className="text-sm text-gray-500">
              Best performing products
            </p>
          </div>
        </div>
        {!hasNoData && (
          <Link
            href="/products"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View All <ArrowUpRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {hasNoData ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Package className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">No sales data available</p>
          <p className="text-xs mt-1">Sales will appear after successful orders</p>
        </div>
      ) : (
        <>
          {/* Summary Card */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Product Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₹{totalProductRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Product List */}
          <div className="space-y-3">
            {productSales.map((product, index) => {
              const percentage = (product.totalRevenue / totalProductRevenue) * 100;
              return (
                <div
                  key={product.productId}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-700">
                          #{index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {product.productName}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {product.orderCount} {product.orderCount === 1 ? "order" : "orders"}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {product.totalQuantity} units sold
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{product.totalRevenue.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {percentage.toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default ProductSalesReport;
