export interface TransactionPayload {
  product_id?: number;
  category_id: number;
  transaction_type: string;
  amount?: number;
  description: string;
  date: string;
}

export interface Transaction {
  id?: number;
  user_id: number;
  product_id?: number;
  category_id: number;
  transaction_type: string;
  amount: float;
  description: string;
  date: string;
}
