import { buildUrl, getAuthHeaders } from "./api";
import type {
  CreateTransactionResponse,
  Transaction,
  TransactionPayload,
} from "../types/transaction";

export async function fetchTransactions(token: string): Promise<Transaction[]> {
  const res = await fetch(buildUrl("/transactions"), {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    console.error("Error fetching transactions:", await res.text());
    return [];
  }
  const transactions = await res.json();
  // Convert cents to dollars for frontend
  return transactions;
}

export async function createTransaction(
  token: string,
  payload: TransactionPayload,
): Promise<CreateTransactionResponse> {
  const res = await fetch(buildUrl("/transactions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Transaction creation error: ${msg}`);
  }

  // Now we receive the expanded response with transaction, product, product_price
  const data: CreateTransactionResponse = await res.json();
  return data;
}
