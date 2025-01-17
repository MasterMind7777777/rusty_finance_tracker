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
  return (await res.json()) as Transaction[];
}

export async function createTransaction(
  token: string,
  payload: TransactionPayload,
): Promise<boolean> {
  const res = await fetch(buildUrl("/transactions"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("Transaction creation error:", await res.text());
    return false;
  }
  return true;
}
