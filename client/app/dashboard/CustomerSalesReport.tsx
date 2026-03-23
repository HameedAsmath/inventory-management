"use client";

import { useGetBillingsQuery } from "../state/api";
import { Users, TrendingUp, Loader2, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import Link from "next/link";

type CustomerSalesData = {
  customerId: string;
  customerName: string;
  customerEmail?: string;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
};

const CustomerSalesReport = () => {
  const { data: billings, isLoading, isError } = useGetBillingsQuery();

  const customerSales = useMemo(() => {
    if (!billings) return [];

    const customerMap = new Map<string, CustomerSalesData>();

    billings.forEach((billing) => {
        const existing = customerMap.get(billing.customerId);
        if (existing) {
          existing.totalRevenue += billing.totalAmount;
          existing.orderCount += 1;
          existing.averageOrderValue =
            existing.totalRevenue / existing.orderCount;
        } else {
          customerMap.set(billing.customerId, {
            customerId: billing.customerId,
            customerName: billing.customer.name,
            customerEmail: billing.customer.email,
            totalRevenue: billing.totalAmount,
            orderCount: 1,
            averageOrderValue: billing.totalAmount,
          });
        }
      });

    return Array.from(customerMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5); // Top 5 customers
  }, [billings]);

  const totalCustomerRevenue = useMemo(() => {
    return customerSales.reduce((sum, c) => sum + c.totalRevenue, 0);
  }, [customerSales]);

  const totalCustomers = useMemo(() => {
    if (!billings) return 0;
    const uniqueCustomers = new Set(
      billings.map((b) => b.customerId)
    );
    return uniqueCustomers.size;
  }, [billings]);

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
        <p className="text-gray-500">Failed to load customer sales data</p>
      </div>
    );
  }

  const hasNoData = !billings || billings.length === 0 || customerSales.length === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Users className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Top Customers by Sales
            </h3>
            <p className="text-sm text-gray-500">
              {totalCustomers > 0 ? `${totalCustomers} active ${totalCustomers === 1 ? "customer" : "customers"}` : "Best performing customers"}
            </p>
          </div>
        </div>
        {!hasNoData && (
          <Link
            href="/customers"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View All <ArrowUpRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {hasNoData ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Users className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm font-medium">No customer sales data</p>
          <p className="text-xs mt-1">Sales will appear after successful orders</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-emerald-700">
                ₹{totalCustomerRevenue.toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-gray-600 mb-1">Active Customers</p>
              <p className="text-xl font-bold text-blue-700">
                {totalCustomers}
              </p>
            </div>
          </div>

          {/* Customer List */}
          <div className="space-y-3">
            {customerSales.map((customer, index) => {
              const percentage = (customer.totalRevenue / totalCustomerRevenue) * 100;
              return (
                <div
                  key={customer.customerId}
                  className="p-4 border border-gray-200 rounded-lg hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-emerald-700">
                          {customer.customerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {customer.customerName}
                        </h4>
                        {customer.customerEmail && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {customer.customerEmail}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500">
                            {customer.orderCount} {customer.orderCount === 1 ? "order" : "orders"}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            Avg: ₹{customer.averageOrderValue.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{customer.totalRevenue.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {percentage.toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
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

export default CustomerSalesReport;
