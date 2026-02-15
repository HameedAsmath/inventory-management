# Billing & Customer API Documentation

This document provides details on how to interact with the Billing and Customer APIs from the frontend.

## Base URL

All API endpoints are relative to your server base URL (e.g., `http://localhost:3001`)

---

## Customer API Endpoints

### 1. Get All Customers

**Endpoint:** `GET /customers`

**Query Parameters:**
- `search` (optional): Search customers by name or email

**Example Request:**
```typescript
// Get all customers
const response = await fetch('http://localhost:3001/customers');

// Search customers
const response = await fetch('http://localhost:3001/customers?search=john');
```

**Response:**
```json
[
  {
    "customerId": "CUST001",
    "name": "John Doe",
    "email": "john@example.com",
    "address": "123 Main St"
  }
]
```

---

### 2. Get Customer by ID

**Endpoint:** `GET /customers/:customerId`

**Example Request:**
```typescript
const response = await fetch('http://localhost:3001/customers/CUST001');
```

**Response:**
```json
{
  "customerId": "CUST001",
  "name": "John Doe",
  "email": "john@example.com",
  "address": "123 Main St",
  "Billing": [
    {
      "billingId": "BILL001",
      "totalAmount": 150.00,
      "timestamp": "2024-01-15T10:30:00Z",
      "BillingItem": [...]
    }
  ]
}
```

**Error Response (404):**
```json
{
  "message": "Customer not found"
}
```

---

### 3. Create Customer

**Endpoint:** `POST /customers`

**Request Body:**
```typescript
{
  customerId: string;    // Required - Unique customer identifier
  name: string;          // Required
  email?: string;        // Optional - Must be unique if provided
  address?: string;      // Optional
}
```

**Example Request:**
```typescript
const response = await fetch('http://localhost:3001/customers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    customerId: 'CUST002',
    name: 'Jane Smith',
    email: 'jane@example.com',
    address: '456 Oak Ave'
  })
});
```

**Response (201):**
```json
{
  "customerId": "CUST002",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "address": "456 Oak Ave"
}
```

**Error Responses:**
- `400`: Missing required fields or duplicate customerId/email
- `500`: Server error

---

### 4. Update Customer

**Endpoint:** `PUT /customers/:customerId`

**Request Body:**
```typescript
{
  name?: string;
  email?: string;
  address?: string;
}
```

**Example Request:**
```typescript
const response = await fetch('http://localhost:3001/customers/CUST001', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Updated',
    email: 'john.updated@example.com'
  })
});
```

**Response:**
```json
{
  "customerId": "CUST001",
  "name": "John Updated",
  "email": "john.updated@example.com",
  "address": "123 Main St"
}
```

**Error Responses:**
- `404`: Customer not found
- `400`: Email already exists
- `500`: Server error

---

### 5. Delete Customer

**Endpoint:** `DELETE /customers/:customerId`

**Example Request:**
```typescript
const response = await fetch('http://localhost:3001/customers/CUST001', {
  method: 'DELETE'
});
```

**Response:**
```json
{
  "message": "Customer deleted successfully"
}
```

**Error Responses:**
- `404`: Customer not found
- `400`: Customer has existing bills (cannot delete)
- `500`: Server error

---

## Billing API Endpoints

### 1. Create Billing

**Endpoint:** `POST /billing`

**Request Body:**
```typescript
{
  billingId: string;        // Required - Unique billing identifier
  customerId: string;        // Required - Existing customer ID
  totalAmount: number;       // Required - Total amount (calculated on frontend)
  items: Array<{            // Required - Array of products
    productId: string;       // Required
    quantity: number;        // Required
    price: number;          // Required - Unit price at time of billing
  }>;
}
```

**Example Request:**
```typescript
const response = await fetch('http://localhost:3001/billing', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    billingId: 'BILL001',
    customerId: 'CUST001',
    totalAmount: 150.00,
    items: [
      {
        productId: 'PROD001',
        quantity: 2,
        price: 50.00
      },
      {
        productId: 'PROD002',
        quantity: 1,
        price: 50.00
      }
    ]
  })
});
```

**Response (201):**
```json
{
  "billingId": "BILL001",
  "customerId": "CUST001",
  "totalAmount": 150.00,
  "timestamp": "2024-01-15T10:30:00Z",
  "customer": {
    "customerId": "CUST001",
    "name": "John Doe",
    "email": "john@example.com",
    "address": "123 Main St"
  },
  "BillingItem": [
    {
      "billingItemId": "BILL001-PROD001",
      "billingId": "BILL001",
      "productId": "PROD001",
      "quantity": 2,
      "price": 50.00,
      "subtotal": 100.00,
      "product": {
        "productId": "PROD001",
        "name": "Product 1",
        "price": 50.00,
        "stockQuantity": 8,
        "rating": 4.5
      }
    },
    {
      "billingItemId": "BILL001-PROD002",
      "billingId": "BILL001",
      "productId": "PROD002",
      "quantity": 1,
      "price": 50.00,
      "subtotal": 50.00,
      "product": {
        "productId": "PROD002",
        "name": "Product 2",
        "price": 50.00,
        "stockQuantity": 9,
        "rating": 4.0
      }
    }
  ]
}
```

**Important Notes:**
- Product stock quantities are **automatically reduced** when a billing is created
- If any product has insufficient stock, the entire operation is rolled back
- All operations are performed in a transaction for data consistency

**Error Responses:**
- `400`: Missing required fields, invalid items array, product not found, or insufficient stock
- `404`: Customer not found
- `500`: Server error

**Example Error Response (Insufficient Stock):**
```json
{
  "message": "Insufficient stock for product Product 1. Available: 1, Requested: 2"
}
```

---

### 2. Get All Billings

**Endpoint:** `GET /billing`

**Example Request:**
```typescript
const response = await fetch('http://localhost:3001/billing');
```

**Response:**
```json
[
  {
    "billingId": "BILL001",
    "customerId": "CUST001",
    "totalAmount": 150.00,
    "timestamp": "2024-01-15T10:30:00Z",
    "customer": {
      "customerId": "CUST001",
      "name": "John Doe",
      "email": "john@example.com",
      "address": "123 Main St"
    },
    "BillingItem": [
      {
        "billingItemId": "BILL001-PROD001",
        "quantity": 2,
        "price": 50.00,
        "subtotal": 100.00,
        "product": {
          "productId": "PROD001",
          "name": "Product 1",
          "price": 50.00
        }
      }
    ]
  }
]
```

**Note:** Billings are returned in descending order by timestamp (newest first)

---

### 3. Get Billing by ID

**Endpoint:** `GET /billing/:billingId`

**Example Request:**
```typescript
const response = await fetch('http://localhost:3001/billing/BILL001');
```

**Response:**
```json
{
  "billingId": "BILL001",
  "customerId": "CUST001",
  "totalAmount": 150.00,
  "timestamp": "2024-01-15T10:30:00Z",
  "customer": {
    "customerId": "CUST001",
    "name": "John Doe",
    "email": "john@example.com",
    "address": "123 Main St"
  },
  "BillingItem": [
    {
      "billingItemId": "BILL001-PROD001",
      "billingId": "BILL001",
      "productId": "PROD001",
      "quantity": 2,
      "price": 50.00,
      "subtotal": 100.00,
      "product": {
        "productId": "PROD001",
        "name": "Product 1",
        "price": 50.00,
        "stockQuantity": 8,
        "rating": 4.5
      }
    }
  ]
}
```

**Error Response (404):**
```json
{
  "message": "Billing not found"
}
```

---

## TypeScript Interface Examples

For better type safety in your frontend, you can use these TypeScript interfaces:

```typescript
interface Customer {
  customerId: string;
  name: string;
  email?: string;
  address?: string;
}

interface BillingItem {
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
    stockQuantity: number;
    rating?: number;
  };
}

interface Billing {
  billingId: string;
  customerId: string;
  totalAmount: number;
  timestamp: string;
  customer: Customer;
  BillingItem: BillingItem[];
}

interface CreateBillingRequest {
  billingId: string;
  customerId: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
}
```

---

## Common Workflow

### Creating a Bill

1. **Get or Create Customer:**
   ```typescript
   // Search for existing customer
   const customers = await fetch('/customers?search=john');
   
   // Or create new customer
   const newCustomer = await fetch('/customers', {
     method: 'POST',
     body: JSON.stringify({
       customerId: 'CUST001',
       name: 'John Doe',
       email: 'john@example.com'
     })
   });
   ```

2. **Get Products:**
   ```typescript
   const products = await fetch('/products');
   ```

3. **Create Billing:**
   ```typescript
   const billing = await fetch('/billing', {
     method: 'POST',
     body: JSON.stringify({
       billingId: 'BILL001',
       customerId: 'CUST001',
       totalAmount: 150.00, // Calculate on frontend
       items: [
         { productId: 'PROD001', quantity: 2, price: 50.00 },
         { productId: 'PROD002', quantity: 1, price: 50.00 }
       ]
     })
   });
   ```

4. **Handle Response:**
   - On success: Stock is automatically reduced, billing is created
   - On error: Check error message for details (insufficient stock, invalid customer, etc.)

---

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `201`: Created successfully
- `400`: Bad request (validation errors, insufficient stock, etc.)
- `404`: Resource not found
- `500`: Server error

Always check the response status and handle errors appropriately:

```typescript
const response = await fetch('/billing', {
  method: 'POST',
  body: JSON.stringify(billingData)
});

if (!response.ok) {
  const error = await response.json();
  console.error('Error:', error.message);
  // Handle error appropriately
} else {
  const billing = await response.json();
  // Handle success
}
```

---

## Notes

1. **Stock Management**: Product stock is automatically reduced when a billing is created. Always check product stock before allowing users to add items to a bill.

2. **Price Storage**: The price stored in `BillingItem` is the unit price at the time of billing, preserving historical pricing even if product prices change later.

3. **Transactions**: All billing operations are atomic - if any part fails (e.g., insufficient stock), the entire operation is rolled back.

4. **Customer Deletion**: Customers with existing bills cannot be deleted to maintain data integrity.

5. **Unique Constraints**: 
   - `customerId` must be unique
   - `email` must be unique (if provided)
   - `billingId` must be unique
