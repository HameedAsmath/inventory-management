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

export interface ExpenseSummary {
  expenseSummarId: string;
  totalExpenses: number;
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
}

export interface Customer {
  customerId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  totalOutstanding?: number;
  totalCredit?: number;
  totalBilled?: number;
  totalPaid?: number;
  balance?: number;
}

export interface Supplier {
  supplierId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  createdAt: string;
}

export interface NewSupplier {
  name: string;
  phone?: string;
  address?: string;
}

export interface CustomerWithBillings extends Customer {
  Billing: Billing[];
  payments: CustomerPayment[];
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
  timestamp: string;
  customer: Customer;
  BillingItem: BillingItem[];
}

export interface PurchaseItem {
  purchaseItemId: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  costPrice: number;
  totalCost: number;
  product: Product;
}

export interface Purchase {
  purchaseId: string;
  supplierId: string;
  purchaseDate: string;
  notes?: string | null;
  totalAmount: number;
  createdAt: string;
  supplier: Supplier;
  purchaseItems: PurchaseItem[];
}

export interface CreatePurchaseRequest {
  supplierId: string;
  purchaseDate: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    costPrice: number;
  }>;
}

export interface PurchaseAnalytics {
  totalPurchasesToday: number;
  todayPurchaseCount: number;
  totalPurchaseCost: number;
  purchaseCount: number;
  stockValue: number;
  stockLevels: {
    totalProducts: number;
    totalStockUnits: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  topPurchasedProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalCost: number;
  }>;
  monthlyPurchaseTrend: Array<{
    month: string;
    totalCost: number;
    purchaseCount: number;
  }>;
}

export interface CreateBillingRequest {
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
}

export interface UpdateBillingRequest {
  customerId: string;
  totalAmount: number;
  pnfCharges: number;
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

export interface CustomerPayment {
  paymentId: string;
  customerId: string;
  amount: number;
  type: "payment" | "advance";
  timestamp: string;
}

export interface CustomerLedger {
  customer: Customer;
  bills: Billing[];
  payments: CustomerPayment[];
  outstanding: number;
  credit: number;
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
    "Expenses",
    "Customers",
    "Suppliers",
    "Billings",
    "Purchases",
    "PurchaseAnalytics",
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
    getCustomerLedger: build.query<CustomerLedger, string>({
      query: (customerId) => `/customers/${customerId}/ledger`,
      providesTags: ["Customers", "Billings"],
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
    recordCustomerPayment: build.mutation<
      { customer: Customer; entries: CustomerPayment[] },
      { customerId: string; amount: number }
    >({
      query: ({ customerId, amount }) => ({
        url: `/customers/${customerId}/pay`,
        method: "POST",
        body: { amount },
      }),
      invalidatesTags: ["Customers", "Billings"],
    }),
    updateCustomerPayment: build.mutation<
      { payment: CustomerPayment; customer: Customer },
      { customerId: string; paymentId: string; amount: number }
    >({
      query: ({ customerId, paymentId, amount }) => ({
        url: `/customers/${customerId}/payments/${paymentId}`,
        method: "PATCH",
        body: { amount },
      }),
      invalidatesTags: ["Customers", "Billings"],
    }),
    deleteCustomerPayment: build.mutation<
      { message: string; customer: Customer },
      { customerId: string; paymentId: string }
    >({
      query: ({ customerId, paymentId }) => ({
        url: `/customers/${customerId}/payments/${paymentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customers", "Billings"],
    }),

    // Suppliers
    getSuppliers: build.query<Supplier[], string | void>({
      query: (search) => `/suppliers${search ? `?search=${search}` : ""}`,
      providesTags: ["Suppliers"],
    }),
    createSupplier: build.mutation<Supplier, NewSupplier>({
      query: (newSupplier) => ({
        url: "/suppliers",
        method: "POST",
        body: newSupplier,
      }),
      invalidatesTags: ["Suppliers"],
    }),
    updateSupplier: build.mutation<
      Supplier,
      { supplierId: string; data: Partial<NewSupplier> }
    >({
      query: ({ supplierId, data }) => ({
        url: `/suppliers/${supplierId}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Suppliers"],
    }),
    deleteSupplier: build.mutation<{ message: string }, string>({
      query: (supplierId) => ({
        url: `/suppliers/${supplierId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Suppliers"],
    }),

    // Purchases
    getPurchases: build.query<Purchase[], void>({
      query: () => "/purchases",
      providesTags: ["Purchases"],
    }),
    createPurchase: build.mutation<Purchase, CreatePurchaseRequest>({
      query: (purchaseData) => ({
        url: "/purchases",
        method: "POST",
        body: purchaseData,
      }),
      invalidatesTags: ["Purchases", "Products", "PurchaseAnalytics"],
    }),
    getPurchaseAnalytics: build.query<PurchaseAnalytics, void>({
      query: () => "/purchases/analytics",
      providesTags: ["PurchaseAnalytics", "Products"],
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
  useGetExpensesQuery,
  useGetExpenseByIdQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useGetCustomerLedgerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useRecordCustomerPaymentMutation,
  useUpdateCustomerPaymentMutation,
  useDeleteCustomerPaymentMutation,
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useGetPurchasesQuery,
  useCreatePurchaseMutation,
  useGetPurchaseAnalyticsQuery,
  useGetBillingsQuery,
  useGetBillingByIdQuery,
  useCreateBillingMutation,
  useUpdateBillingMutation,
  useSendBillingEmailMutation,
  useSendCustomerStatementEmailMutation,
} = api;
