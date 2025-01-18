import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";

import { useAuth } from "../contexts/AuthContext";
import {
  fetchTransactions,
  createTransaction,
} from "../services/TransactionService";
import { fetchProducts, createProduct } from "../services/ProductService";
import {
  fetchProductPrices,
  createProductPrice,
} from "../services/PriceService";

// Types from your codebase
import type { Transaction } from "../types/transaction";
import type { Product } from "../types/product";
import type { ProductPrice } from "../types/price";
import type { TransactionPayload } from "../types/transaction";

// The reusable Autocomplete wrapper
import { AutocompleteMui } from "../components/Autocomplete/Autocomplete";

/**
 * TransactionsPage:
 *   - transaction_type: "income" | "expense"
 *   - amount can be typed or come from a known ProductPrice
 *   - product can be selected from existing or typed new
 *   - if user types a new "price" in the Autocomplete, we create it on the fly (once we know product_id + date)
 */
export default function TransactionsPage() {
  const { token } = useAuth();

  // Transaction form fields
  const [txType, setTxType] = useState<"Income" | "Expense">("Expense");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState<Dayjs>(dayjs());
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Product data
  const [products, setProducts] = useState<Product[]>([]);
  const [productInput, setProductInput] = useState(""); // typed product name
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // ProductPrice data
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [priceInput, setPriceInput] = useState(""); // typed price if new
  const [selectedPrice, setSelectedPrice] = useState<ProductPrice | null>(null);

  // Avoid double creation in Strict Mode
  const creatingRef = useRef(false);

  useEffect(() => {
    if (token) {
      handleRefreshTransactions();
      handleRefreshProducts();
      handleRefreshPrices();
    }
  }, [token]);

  // ==============================
  // Fetching
  // ==============================
  async function handleRefreshTransactions() {
    if (!token) return;
    try {
      const data = await fetchTransactions(token);
      setTransactions(data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  }

  async function handleRefreshProducts() {
    if (!token) return;
    try {
      const data = await fetchProducts(token);
      setProducts(data);
    } catch (err) {
      console.error("Error fetching products:", err);
    }
  }

  async function handleRefreshPrices() {
    if (!token) return;
    try {
      const data = await fetchProductPrices(token);

      // Keep only the "latest" price per product
      const latestMap = data.reduce((acc, price) => {
        const existing = acc.get(price.product_id);
        if (!existing) {
          acc.set(price.product_id, price);
        } else if (
          dayjs(price.created_at).isAfter(dayjs(existing.created_at))
        ) {
          acc.set(price.product_id, price);
        }
        return acc;
      }, new Map<number, ProductPrice>());

      setPrices(Array.from(latestMap.values()));
    } catch (err) {
      console.error("Error fetching prices:", err);
    }
  }

  // ==============================
  // Helpers
  // ==============================

  /**
   * If user typed a new product name, create it on the fly.
   * Otherwise, use the selected product.
   */
  async function ensureProduct(): Promise<Product | null> {
    if (!token) return null;
    if (selectedProduct) return selectedProduct;

    if (productInput.trim()) {
      if (creatingRef.current) {
        console.log("Skipping duplicate product creation call...");
        return null;
      }
      creatingRef.current = true;

      try {
        const newProd = await createProduct(token, {
          name: productInput.trim(),
        });
        if (!newProd) {
          console.error("Failed to create product");
          return null;
        }
        setProducts((prev) => [...prev, newProd]);
        setSelectedProduct(newProd);
        return newProd;
      } catch (err) {
        console.error("Error creating product:", err);
        return null;
      } finally {
        creatingRef.current = false;
      }
    }
    return null;
  }

  /**
   * If user typed a new "price" in the Autocomplete for ProductPrice,
   * create a new ProductPrice once we know product_id + date.
   */
  async function ensurePrice(product_id: number, date: Dayjs): Promise<number> {
    // If user selected an existing ProductPrice, use that
    if (selectedPrice) {
      return selectedPrice.price;
    }

    // If user typed something in `priceInput`, create a new ProductPrice
    const typed = priceInput.trim();
    if (typed) {
      const parsed = parseInt(typed, 10);
      if (isNaN(parsed) || parsed <= 0) {
        console.log("Invalid typed price, ignoring...");
        return 0;
      }
      // We have a valid typed price, create it in the backend
      try {
        const created = await createProductPrice(token!, {
          product_id,
          price: parsed,
          created_at: date.format("YYYY-MM-DDTHH:mm:ss"),
        });
        if (created) {
          console.log("Typed product price created:", created);
          // Possibly store it in `prices` if you want
          setPrices((prev) => [...prev, created]);
          return created.price;
        }
      } catch (err) {
        console.error("Error creating typed product price:", err);
      }
    }

    // If no typed price or creation failed, fallback
    return 0;
  }

  // ==============================
  // Create Transaction
  // ==============================
  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    try {
      // Ensure product
      const prod = await ensureProduct();
      if (!prod?.id) {
        console.log(
          "No product selected or created, cannot create transaction.",
        );
        return;
      }

      // Compute final date string
      const dateStr = txDate.format("YYYY-MM-DDTHH:mm:ss");
      // Possibly create a new typed ProductPrice if needed
      const finalAmount = await ensurePrice(prod.id, txDate);

      if (!finalAmount) {
        console.log("No valid final amount typed or selected, skipping...");
        return;
      }

      // Build payload
      const payload: TransactionPayload = {
        product_id: prod.id,
        transaction_type: txType, // "income" or "expense"
        amount: finalAmount,
        description: txDescription.trim(),
        date: dateStr,
      };

      // Call createTransaction
      const success = await createTransaction(token, payload);
      if (success) {
        console.log("Transaction created. Refreshing...");
        handleRefreshTransactions();

        // Reset
        setTxType("Expense");
        setTxAmount("");
        setTxDescription("");
        setTxDate(dayjs());
        setSelectedProduct(null);
        setProductInput("");
        setSelectedPrice(null);
        setPriceInput("");
      }
    } catch (err) {
      console.error("Error creating transaction:", err);
    }
  }

  // ==============================
  // Render
  // ==============================
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
            ID: {tx.id}, product_id: {tx.product_id}, type:{" "}
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
          onChange={(e) => setTxType(e.target.value as "Income" | "Expense")}
          sx={{ mb: 2, width: "300px" }}
          size="small"
        >
          <MenuItem value="Expense">Expense</MenuItem>
          <MenuItem value="Income">Income</MenuItem>
        </Select>

        {/* (Fallback) Manual numeric amount if typed, but we'll let typed ProductPrice override */}
        <TextField
          label="Fallback Amount (optional)"
          variant="outlined"
          size="small"
          value={txAmount}
          onChange={(e) => setTxAmount(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        {/* Autocomplete for ProductPrice (allowNewValue=true => user can type a new price) */}
        <AutocompleteMui<ProductPrice>
          items={prices}
          getOptionLabel={(option) => {
            if (typeof option === "string") {
              return option; // typed user string
            }
            return String(option.price); // existing ProductPrice
          }}
          onSelect={(val) => {
            // val can be string | ProductPrice | null
            if (!val) {
              // cleared
              setSelectedPrice(null);
              setPriceInput("");
            } else if (typeof val === "string") {
              // typed new price
              setSelectedPrice(null);
              setPriceInput(val);
            } else {
              // existing ProductPrice
              setSelectedPrice(val);
              setPriceInput("");
            }
          }}
          onInputChange={(typedVal) => setPriceInput(typedVal)}
          label="Select or Type a Product Price"
          allowNewValue={true}
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

        {/* Product */}
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          Select or Type Product (required)
        </Typography>
        <AutocompleteMui<Product>
          items={products}
          // If user typed new, or selected existing
          getOptionLabel={(option) => {
            if (typeof option === "string") {
              return option;
            }
            return option.name;
          }}
          onSelect={(val) => {
            if (!val) {
              setSelectedProduct(null);
              setProductInput("");
            } else if (typeof val === "string") {
              setSelectedProduct(null);
              setProductInput(val);
            } else {
              setSelectedProduct(val);
              setProductInput("");
            }
          }}
          onInputChange={(inputVal) => setProductInput(inputVal)}
          label="Product"
          allowNewValue={true}
        />

        <Button variant="contained" type="submit" sx={{ mt: 2 }}>
          Create Transaction
        </Button>
      </Box>
    </Box>
  );
}
