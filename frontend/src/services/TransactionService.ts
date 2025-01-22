import { buildUrl, getAuthHeaders } from "./api";
import type {
  CreatedTransaction,
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
  return transactions.map((transaction: Transaction) => ({
    ...transaction,
    amount: transaction.amount ? transaction.amount / 100 : 0,
  }));
}

export async function createTransaction(
  token: string,
  payload: TransactionPayload,
): Promise<CreatedTransaction> {
  // Convert amount to cents if present
  if (payload.amount) {
    payload.amount = Math.round(payload.amount * 100);
  }

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

  const data: CreatedTransaction = await res.json();
  return data;
}
