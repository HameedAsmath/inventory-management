import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
export interface Product {
  productId: string;
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
}

export interface NewProduct {
  name: string;
  price: number;
  rating?: number;
  stockQuantity: number;
}

export interface SalesSummary {
  salesSummaryId: string;
  totalValue: number;
  changePercentage?: number;
  date: string;
}

export interface PurchaseSummary {
  purchaseSummaryId: string;
  totalPurchased: number;
  changePercentage?: number;
  date: string;
}

export interface ExpenseSummary {
  expenseSummarId: string;
  totalExpenses: number;
  date: string;
}

export interface ExpenseByCategorySummary {
  expenseByCategorySummaryId: string;
  category: string;
  amount: string;
  date: string;
}

export interface DashboardMetrics {
  popularProducts: Product[];
  salesSummary: SalesSummary[];
  purchaseSummary: PurchaseSummary[];
  expenseSummary: ExpenseSummary[];
  expenseByCategorySummary: ExpenseByCategorySummary[];
}

export interface User {
  userId: string;
  name: string;
  email: string;
}

// Customer interfaces
export interface Customer {
  customerId: string;
  name: string;
  email?: string;
  address?: string;
}

export interface CustomerWithBillings extends Customer {
  Billing: Billing[];
}

export interface NewCustomer {
  customerId: string;
  name: string;
  email?: string;
  address?: string;
}

export interface UpdateCustomer {
  name?: string;
  email?: string;
  address?: string;
}

// Billing interfaces
export interface BillingItem {
  billingItemId: string;
  billingId: string;
  productId: string;
  quantity: number;
  price: number;
  subtotal: number;
  product: {
    productId: string;
    name: string;
    price: number;
    stockQuantity?: number;
    rating?: number;
  };
}

export interface Billing {
  billingId: string;
  customerId: string;
  totalAmount: number;
  timestamp: string;
  customer: Customer;
  BillingItem: BillingItem[];
}

export interface CreateBillingRequest {
  billingId: string;
  customerId: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}

export const api = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL }),
  reducerPath: "api",
  tagTypes: [
    "DashboardMetrics",
    "Products",
    "Users",
    "ExpensesByCategory",
    "Customers",
    "Billings",
  ],
  endpoints: (build) => ({
    // Dashboard
    getDashboardMetrics: build.query<DashboardMetrics, void>({
      query: () => "/dashboard",
      providesTags: ["DashboardMetrics"],
    }),

    // Products
    getProducts: build.query<Product[], string | void>({
      query: (search) => `/products?search=${search ?? ""}`,
      providesTags: ["Products"],
    }),
    createProduct: build.mutation<Product, NewProduct>({
      query: (newProduct) => ({
        url: "/products",
        method: "POST",
        body: newProduct,
      }),
      invalidatesTags: ["Products"],
    }),

    // Users
    getUsers: build.query<User[], void>({
      query: () => "/users",
      providesTags: ["Users"],
    }),

    // Expenses
    getExpensesByCategory: build.query<ExpenseByCategorySummary[], void>({
      query: () => "/expenses",
      providesTags: ["ExpensesByCategory"],
    }),

    // Customers
    getCustomers: build.query<Customer[], string | void>({
      query: (search) => `/customers${search ? `?search=${search}` : ""}`,
      providesTags: ["Customers"],
    }),
    getCustomerById: build.query<CustomerWithBillings, string>({
      query: (customerId) => `/customers/${customerId}`,
      providesTags: ["Customers"],
    }),
    createCustomer: build.mutation<Customer, NewCustomer>({
      query: (newCustomer) => ({
        url: "/customers",
        method: "POST",
        body: newCustomer,
      }),
      invalidatesTags: ["Customers"],
    }),
    updateCustomer: build.mutation<
      Customer,
      { customerId: string; data: UpdateCustomer }
    >({
      query: ({ customerId, data }) => ({
        url: `/customers/${customerId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Customers"],
    }),
    deleteCustomer: build.mutation<{ message: string }, string>({
      query: (customerId) => ({
        url: `/customers/${customerId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customers"],
    }),

    // Billings
    getBillings: build.query<Billing[], void>({
      query: () => "/billing",
      providesTags: ["Billings"],
    }),
    getBillingById: build.query<Billing, string>({
      query: (billingId) => `/billing/${billingId}`,
      providesTags: ["Billings"],
    }),
    createBilling: build.mutation<Billing, CreateBillingRequest>({
      query: (billingData) => ({
        url: "/billing",
        method: "POST",
        body: billingData,
      }),
      invalidatesTags: ["Billings", "Products"],
    }),
  }),
});

export const {
  useGetDashboardMetricsQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useGetUsersQuery,
  useGetExpensesByCategoryQuery,
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useGetBillingsQuery,
  useGetBillingByIdQuery,
  useCreateBillingMutation,
} = api;
