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
import { Box, Typography, Button, TextField } from "@mui/material";
import { AutocompleteMui } from "../components/Autocomplete/Autocomplete";
import { LocalizationProvider, DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { ProductPrice } from "../types/price";
import { fetchProductPrices } from "../services/PriceService";

export default function TransactionsPage() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [prices, setPrices] = useState<ProductPrice[]>([]);

  const [txType, setTxType] = useState("expense");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState(dayjs());

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

  async function handleRefreshPrices() {
    if (!token) return;
    const data = await fetchProductPrices(token);
    setPrices(data);
  }

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

    // if selectedPrice use it else amount
    const success = await createTransaction(token, {
      product_id: selectedProduct?.id || undefined,
      category_id: selectedCategory.id,
      transaction_type: txType,
      amount: selectedPrice ? selectedPrice.price : parseFloat(txAmount),
      description: txDescription,
      date: txDate.toISOString(),
    });

    if (success) {
      console.log("Transaction created. Refreshing...");
      handleRefreshTransactions();
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

        <TextField
          label="Transaction Type"
          variant="outlined"
          size="small"
          value={txType}
          onChange={(e) => setTxType(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        <TextField
          label="Amount"
          variant="outlined"
          size="small"
          value={txAmount}
          onChange={(e) => setTxAmount(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        {/* AutocompleteMui fot price */}
        <AutocompleteMui<ProductPrice>
          items={prices}
          getOptionLabel={(p) =>
            typeof p === "object" && "price" in p ? p.price : String(p)
          }
          onSelect={(p) => setSelectedPrice(p)}
          label="Price"
        />

        <TextField
          label="Description"
          variant="outlined"
          size="small"
          value={txDescription}
          onChange={(e) => setTxDescription(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="Transaction Date"
            value={txDate ? dayjs(txDate) : null}
            onChange={(newValue: Dayjs | null) => {
              if (!newValue) {
                return;
              }
              setTxDate(newValue);
            }}
            sx={{ mb: 2, width: "300px" }}
          />
        </LocalizationProvider>

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
        />

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
        />

        <Button variant="contained" type="submit">
          Create Transaction
        </Button>
      </Box>
    </Box>
  );
}
