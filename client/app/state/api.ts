import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Product {
  productId: string;
  name: string;
  price1: number;
  price2?: number | null;
  cp?: number | null;
  category?: string | null;
  stockQuantity: number;
}

export interface NewProduct {
  name: string;
  price1: number;
  price2?: number;
  cp?: number;
  category?: string;
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

export interface Expense {
  expenseId: string;
  title: string;
  description?: string | null;
  amount: number;
  status: PaymentStatus;
  timestamp: string;
}

export interface CreateExpenseRequest {
  title: string;
  description?: string;
  amount: number;
  status?: PaymentStatus;
}

export interface UpdateExpenseRequest {
  title?: string;
  description?: string;
  amount?: number;
  status?: PaymentStatus;
}

export interface DashboardMetrics {
  popularProducts: Product[];
  salesSummary: SalesSummary[];
  purchaseSummary: PurchaseSummary[];
}

export interface Customer {
  customerId: string;
  name: string;
  email?: string;
  address?: string;
  totalBilled?: number;
  totalPaid?: number;
  balance?: number;
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

export interface BillingItem {
  billingItemId: string;
  billingId: string;
  productId: string;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
  product: {
    productId: string;
    name: string;
    price1: number;
    price2?: number | null;
    stockQuantity?: number;
  };
}

export type PaymentStatus = "pending" | "success" | "cancelled";

export interface Billing {
  billingId: string;
  customerId: string;
  totalAmount: number;
  pnfCharges: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  timestamp: string;
  customer: Customer;
  BillingItem: BillingItem[];
}

export interface CreateBillingRequest {
  billingId: string;
  customerId: string;
  totalAmount: number;
  pnfCharges: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    discount: number;
  }>;
}

export interface UpdateBillingRequest {
  customerId: string;
  totalAmount: number;
  pnfCharges: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    discount: number;
  }>;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  shopName: string;
  shopAddress: string;
  shopPincode: string;
  shopContact: string;
  shopEmail: string;
  shopGst: string;
}

export interface UpdateProfileRequest {
  name?: string;
  shopName?: string;
  shopAddress?: string;
  shopPincode?: string;
  shopContact?: string;
  shopEmail?: string;
  shopGst?: string;
}

export interface AuthResponse {
  user: { id: string; name: string; email: string };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  credentials: "include",
});

export const api = createApi({
  baseQuery,
  reducerPath: "api",
  tagTypes: [
    "DashboardMetrics",
    "Products",
    "ExpensesByCategory",
    "Expenses",
    "Customers",
    "Billings",
    "UserProfile",
  ],
  endpoints: (build) => ({
    // Auth
    login: build.mutation<AuthResponse, LoginRequest>({
      query: (credentials) => ({
        url: "/login",
        method: "POST",
        body: credentials,
      }),
    }),
    register: build.mutation<AuthResponse, RegisterRequest>({
      query: (data) => ({
        url: "/register",
        method: "POST",
        body: data,
      }),
    }),
    logout: build.mutation<{ message: string }, void>({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(api.util.resetApiState());
      },
    }),

    // User Profile (/me)
    getMe: build.query<UserProfile, void>({
      query: () => "/me",
      providesTags: ["UserProfile"],
    }),
    updateMe: build.mutation<UserProfile, UpdateProfileRequest>({
      query: (data) => ({
        url: "/me",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["UserProfile"],
    }),

    // Dashboard
    getDashboardMetrics: build.query<DashboardMetrics, void>({
      query: () => "/dashboard",
      providesTags: ["DashboardMetrics"],
    }),

    // Products
    getProducts: build.query<
      Product[],
      { search?: string; category?: string } | void
    >({
      query: (params) => {
        if (!params || typeof params !== "object") {
          return "/products";
        }
        const search = params.search || "";
        const category = params.category || "";
        const queryParams = new URLSearchParams();
        if (search) queryParams.append("search", search);
        if (category && category !== "all")
          queryParams.append("category", category);
        return `/products${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      },
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
    updateProduct: build.mutation<
      Product,
      { productId: string; data: Partial<NewProduct> }
    >({
      query: ({ productId, data }) => ({
        url: `/products/${productId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Products"],
    }),

    // Expenses (old - for backward compatibility)
    getExpensesByCategory: build.query<ExpenseByCategorySummary[], void>({
      query: () => "/expenses",
      providesTags: ["ExpensesByCategory"],
    }),

    // Expenses CRUD
    getExpenses: build.query<Expense[], string | void>({
      query: (status) => `/expenses${status ? `?status=${status}` : ""}`,
      providesTags: ["Expenses"],
    }),
    getExpenseById: build.query<Expense, string>({
      query: (expenseId) => `/expenses/${expenseId}`,
      providesTags: ["Expenses"],
    }),
    createExpense: build.mutation<Expense, CreateExpenseRequest>({
      query: (expenseData) => ({
        url: "/expenses",
        method: "POST",
        body: expenseData,
      }),
      invalidatesTags: ["Expenses"],
    }),
    updateExpense: build.mutation<
      Expense,
      { expenseId: string; data: UpdateExpenseRequest }
    >({
      query: ({ expenseId, data }) => ({
        url: `/expenses/${expenseId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Expenses"],
    }),
    deleteExpense: build.mutation<{ message: string }, string>({
      query: (expenseId) => ({
        url: `/expenses/${expenseId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Expenses"],
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
      invalidatesTags: ["Billings", "Products", "Customers"],
    }),
    sendBillingEmail: build.mutation<
      { message: string },
      { billingId: string; email?: string }
    >({
      query: ({ billingId, email }) => ({
        url: `/billing/${billingId}/email`,
        method: "POST",
        body: { email },
      }),
    }),
    updateBillingPaymentStatus: build.mutation<
      Billing,
      { billingId: string; paymentStatus: PaymentStatus }
    >({
      query: ({ billingId, paymentStatus }) => ({
        url: `/billing/${billingId}/payment-status`,
        method: "PATCH",
        body: { paymentStatus },
      }),
      invalidatesTags: ["Billings", "Customers"],
    }),
    updateBilling: build.mutation<
      Billing,
      { billingId: string; data: UpdateBillingRequest }
    >({
      query: ({ billingId, data }) => ({
        url: `/billing/${billingId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Billings", "Products", "Customers"],
    }),
    sendCustomerStatementEmail: build.mutation<
      { message: string },
      {
        customerId: string;
        email?: string;
        status?: string;
        from?: string;
        to?: string;
      }
    >({
      query: ({ customerId, ...body }) => ({
        url: `/customers/${customerId}/statement/email`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useGetMeQuery,
  useUpdateMeMutation,
  useGetDashboardMetricsQuery,
  useGetProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useGetExpensesByCategoryQuery,
  useGetExpensesQuery,
  useGetExpenseByIdQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useGetBillingsQuery,
  useGetBillingByIdQuery,
  useCreateBillingMutation,
  useUpdateBillingMutation,
  useSendBillingEmailMutation,
  useUpdateBillingPaymentStatusMutation,
  useSendCustomerStatementEmailMutation,
} = api;
