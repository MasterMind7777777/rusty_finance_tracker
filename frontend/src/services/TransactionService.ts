import { buildUrl, getAuthHeaders } from "./api";
import type { Transaction, TransactionPayload } from "../types/transaction";

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
  return transactions.map((transaction: Transaction) => ({
    ...transaction,
    amount: transaction.amount / 100,
  }));
}

export async function createTransaction(
  token: string,
  payload: TransactionPayload,
): Promise<boolean> {
  // Convert dollars to cents for backend
  const backendPayload = {
    ...payload,
    amount: payload.amount ? Math.round(payload.amount * 100) : null,
  };

  const res = await fetch(buildUrl("/transactions"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(backendPayload),
  });
  if (!res.ok) {
    console.error("Transaction creation error:", await res.text());
    return false;
  }
  return true;
}
