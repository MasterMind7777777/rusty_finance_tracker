import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchTransactions,
  createTransaction,
} from "../services/TransactionService";
import { fetchProducts } from "../services/ProductService";
import { fetchCategories } from "../services/CategoryService";
import { fetchProductPrices } from "../services/PriceService";

import type { Transaction } from "../types/transaction";
import type { Product } from "../types/product";
import type { Category } from "../types/category";
import type { ProductPrice } from "../types/price";

import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import { AutocompleteMui } from "../components/Autocomplete/Autocomplete";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";

export default function TransactionsPage() {
  const { token } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [prices, setPrices] = useState<ProductPrice[]>([]);

  const [txType, setTxType] = useState<"Expense" | "Income">("Expense");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState<Dayjs>(dayjs());

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<ProductPrice | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  useEffect(() => {
    if (token) {
      handleRefreshTransactions();
      handleRefreshProducts();
      handleRefreshCategories();
      handleRefreshPrices();
    }
  }, [token]);

  /**
   * Fetch and set all transactions.
   */
  async function handleRefreshTransactions() {
    if (!token) return;
    try {
      const data = await fetchTransactions(token);
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  }

  /**
   * Fetch and set all products.
   */
  async function handleRefreshProducts() {
    if (!token) return;
    try {
      const data = await fetchProducts(token);
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }

  /**
   * Fetch and set all categories.
   */
  async function handleRefreshCategories() {
    if (!token) return;
    try {
      const data = await fetchCategories(token);
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  /**
   * Fetch prices, remove duplicates (by product_id) and only keep the latest by created_at.
   */
  async function handleRefreshPrices() {
    if (!token) return;
    try {
      const data = await fetchProductPrices(token);

      // Group by product_id and only keep the latest price by created_at
      const latestPricesMap = data.reduce((acc, price) => {
        const existing = acc.get(price.product_id);
        if (!existing) {
          acc.set(price.product_id, price);
        } else {
          // Compare created_at to see which one is newer
          if (dayjs(price.created_at).isAfter(dayjs(existing.created_at))) {
            acc.set(price.product_id, price);
          }
        }
        return acc;
      }, new Map<number, ProductPrice>());

      const uniquePrices = Array.from(latestPricesMap.values());
      setPrices(uniquePrices);
    } catch (error) {
      console.error("Error fetching prices:", error);
    }
  }

  /**
   * Create a new transaction.
   * - If a price is selected, it overrides manually typed amount.
   */
  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      console.log("No token, please log in first.");
      return;
    }
    if (!selectedCategory?.id) {
      console.log("No category selected.");
      return;
    }

    // Determine the final transaction amount
    const finalAmount = selectedPrice
      ? selectedPrice.price
      : parseFloat(txAmount);

    // If there's no valid amount, exit early
    if (isNaN(finalAmount)) {
      console.log("Please enter a valid amount or select a valid price.");
      return;
    }

    try {
      const success = await createTransaction(token, {
        product_id: selectedProduct?.id || undefined,
        category_id: selectedCategory.id,
        transaction_type: txType,
        amount: finalAmount,
        description: txDescription.trim(),
        date: txDate.format("YYYY-MM-DDTHH:mm:ss"),
      });

      if (success) {
        console.log("Transaction created. Refreshing...");
        handleRefreshTransactions();
        // Reset form
        setTxType("Expense");
        setTxAmount("");
        setTxDescription("");
        setTxDate(dayjs());
        setSelectedProduct(null);
        setSelectedPrice(null);
        setSelectedCategory(null);
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Transactions
      </Typography>

      <Button
        variant="contained"
        onClick={handleRefreshTransactions}
        sx={{ mb: 2 }}
      >
        Refresh Transactions
      </Button>

      {transactions.map((tx) => (
        <Box key={tx.id} sx={{ mb: 1 }}>
          <Typography variant="body2">
            ID: {tx.id}, user_id: {tx.user_id}, product_id:{" "}
            {tx.product_id ?? "N/A"}, category_id: {tx.category_id}, type:{" "}
            {tx.transaction_type}, amount: {tx.amount}, desc: {tx.description},
            date: {tx.date}
          </Typography>
        </Box>
      ))}

      <Box component="form" onSubmit={handleCreateTransaction} sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Create a new transaction
        </Typography>

        {/* Transaction Type */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Transaction Type
        </Typography>
        <Select
          value={txType}
          onChange={(e) => setTxType(e.target.value as "Expense" | "Income")}
          sx={{ mb: 2, width: "300px" }}
          size="small"
        >
          <MenuItem value="Expense">Expense</MenuItem>
          <MenuItem value="Income">Income</MenuItem>
        </Select>

        {/* Amount */}
        <TextField
          label="Amount"
          variant="outlined"
          size="small"
          value={txAmount}
          onChange={(e) => setTxAmount(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        {/* Autocomplete for Price */}
        <AutocompleteMui<ProductPrice>
          items={prices}
          getOptionLabel={(p) =>
            typeof p === "object" && "price" in p ? String(p.price) : String(p)
          }
          onSelect={(p) => setSelectedPrice(p)}
          label="Select Latest Price (optional)"
          allowNewValue={false}
        />

        {/* Description */}
        <TextField
          label="Description"
          variant="outlined"
          size="small"
          value={txDescription}
          onChange={(e) => setTxDescription(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        {/* Date */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Transaction Date"
            value={txDate}
            onChange={(newValue) => {
              if (newValue) {
                setTxDate(newValue);
              }
            }}
            sx={{ mb: 2, width: "300px" }}
          />
        </LocalizationProvider>

        {/* Product Selection (optional) */}
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          (Optional) Select Product
        </Typography>
        <AutocompleteMui<Product>
          items={products}
          getOptionLabel={(p) =>
            typeof p === "object" && "name" in p ? p.name : String(p)
          }
          onSelect={(p) => setSelectedProduct(p)}
          label="Product"
          allowNewValue={false}
        />

        {/* Category Selection (required) */}
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          Select Category (required)
        </Typography>
        <AutocompleteMui<Category>
          items={categories}
          getOptionLabel={(c) =>
            typeof c === "object" && "name" in c ? c.name : String(c)
          }
          onSelect={(c) => setSelectedCategory(c)}
          label="Category"
          allowNewValue={false}
        />

        <Button variant="contained" type="submit" sx={{ mt: 2 }}>
          Create Transaction
        </Button>
      </Box>
    </Box>
  );
}
