export interface TransactionPayload {
  product_id: number; // The user must provide a product ID
  transaction_type: "Income" | "Expense";
  amount?: number; // Optional if the user wants to store a product price
  description?: string;
  date: string; // e.g. "2025-01-18T12:00:00"
}

// The actual Transaction structure from the DB (no category_id)
export interface Transaction {
  id: number;
  user_id: number;
  product_id: number; // or product_id?: number if your server might omit it
  category_id?: number; // Because the backend now includes category_id if the product references a category
  transaction_type: "Income" | "Expense";
  description?: string;
  date: string; // e.g. "2025-01-18T12:00:00"
  amount?: number; // If there's a matching product price
}
