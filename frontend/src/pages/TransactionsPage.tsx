import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchTransactions,
  createTransaction,
} from "../services/TransactionService";
import type { Transaction } from "../types/transaction";
import type { Product } from "../types/product";
import type { Category } from "../types/category";
import { fetchProducts } from "../services/ProductService";
import { fetchCategories } from "../services/CategoryService";
import { Autocomplete } from "../components/Autocomplete/Autocomplete";

export default function TransactionsPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [txType, setTxType] = useState("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState("");

  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (token) {
      handleRefreshTransactions();
      handleRefreshProducts();
      handleRefreshCategories();
    }
  }, [token]);

  async function handleRefreshTransactions() {
    if (!token) return;
    const data = await fetchTransactions(token);
    setTransactions(data);
  }

  async function handleRefreshProducts() {
    if (!token) return;
    const data = await fetchProducts(token);
    setProducts(data);
  }

  async function handleRefreshCategories() {
    if (!token) return;
    const data = await fetchCategories(token);
    setCategories(data);
  }

  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      console.log("No token, please log in first.");
      return;
    }
    if (!selectedCategoryId) {
      console.log("No category selected.");
      return;
    }

    const success = await createTransaction(token, {
      product_id: selectedProductId || undefined,
      category_id: selectedCategoryId,
      transaction_type: txType,
      amount: Number(txAmount),
      description: txDescription,
      date: txDate,
    });
    if (success) {
      console.log("Transaction created. Refreshing...");
      handleRefreshTransactions();
    }
  }

  return (
    <div>
      <h2>Transactions</h2>
      <button onClick={handleRefreshTransactions}>Refresh Transactions</button>
      <ul>
        {transactions.map((tx) => (
          <li key={tx.id}>
            ID: {tx.id}, user_id: {tx.user_id}, product_id:{" "}
            {tx.product_id ?? "N/A"}, category_id: {tx.category_id}, type:{" "}
            {tx.transaction_type}, amount: {tx.amount}, desc: {tx.description},
            date: {tx.date}
          </li>
        ))}
      </ul>

      <hr />
      <h3>Create a new transaction</h3>
      <form onSubmit={handleCreateTransaction}>
        <label>Transaction Type (expense/income/etc.):</label>
        <br />
        <input
          type="text"
          value={txType}
          onChange={(e) => setTxType(e.target.value)}
        />
        <br />
        <label>Amount:</label>
        <br />
        <input
          type="text"
          value={txAmount}
          onChange={(e) => setTxAmount(e.target.value)}
        />
        <br />
        <label>Description:</label>
        <br />
        <input
          type="text"
          value={txDescription}
          onChange={(e) => setTxDescription(e.target.value)}
        />
        <br />
        <label>Date (YYYY-MM-DD):</label>
        <br />
        <input
          type="text"
          value={txDate}
          onChange={(e) => setTxDate(e.target.value)}
        />
        <br />

        <label>(Optional) Select Product by name:</label>
        <Autocomplete<Product>
          items={products}
          placeholder="Type product name..."
          getLabel={(p) => p.name}
          getId={(p) => p.id || 0}
          onSelect={(id) => setSelectedProductId(id)}
        />
        <br />

        <label>Select Category by name (required):</label>
        <Autocomplete<Category>
          items={categories}
          placeholder="Type category name..."
          getLabel={(c) => c.name}
          getId={(c) => c.id || 0}
          onSelect={(id) => setSelectedCategoryId(id)}
        />
        <br />
        <button type="submit">Create Transaction</button>
      </form>
    </div>
  );
}
