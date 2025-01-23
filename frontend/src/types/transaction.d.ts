export interface TransactionPayload {
  // If user picks an existing product:
  product_id?: number;
  // Or typed a new product:
  product_name?: string;

  // If user picks an existing price:
  product_price_id?: number;
  // Or typed a new price (in cents):
  price?: number;

  transaction_type: "Income" | "Expense";
  description?: string;
  date: string; // e.g. "2025-01-22T12:59:36"
}

// The actual Transaction structure from the DB (no category_id)
export interface Transaction {
  id: number;
  user_id: number;
  product_id: number; // or product_id?: number if your server might omit it
  product_price_id: number;
  category_id?: number; // Because the backend now includes category_id if the product references a category
  transaction_type: "Income" | "Expense";
  description?: string;
  date: string; // e.g. "2025-01-18T12:00:00"
}

export interface CreatedTransaction {
  id: number;
  user_id: number;
  product_id: number;
  product_price_id: number; // not null
  transaction_type: "Income" | "Expense";
  description: string | null;
  date: string; // or Date
}

export interface CreateTransactionResponse {
  transaction: CreatedTransaction; // or your 'Transaction' interface
  product: Product; // your 'Product' type
  product_price: ProductPrice; // your 'ProductPrice' type
}
