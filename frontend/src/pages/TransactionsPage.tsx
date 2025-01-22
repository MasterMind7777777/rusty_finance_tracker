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
import { fetchProducts } from "../services/ProductService";
import { fetchProductPrices } from "../services/PriceService";

// Types from your codebase
import type { Transaction } from "../types/transaction";
import type { Product } from "../types/product";
import type { ProductPrice } from "../types/price";
import type { TransactionPayload } from "../types/transaction";

// The reusable Autocomplete wrapper
import { AutocompleteMui } from "../components/Autocomplete/Autocomplete";

/**
 * TransactionsPage:
 *   - transaction_type: "Income" | "Expense"
 *   - amount can be typed (float) or come from an existing ProductPrice
 *   - product can be selected from existing or typed new
 *   - if user types a new "price" in the Autocomplete, we pass it to the backend in one request
 *   - if user picks an existing product_price_id, we pass that
 *   - the backend handles creation of any needed entities in a single transaction
 */
export default function TransactionsPage() {
  const { token } = useAuth();

  // Transaction form fields
  const [txType, setTxType] = useState<"Income" | "Expense">("Expense");
  const [txAmount, setTxAmount] = useState(""); // fallback typed amount in float form
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

  // ==============================
  // Fetch existing data
  // ==============================
  useEffect(() => {
    if (token) {
      handleRefreshTransactions();
      handleRefreshProducts();
      handleRefreshPrices();
    }
  }, [token]);

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
  // Create Transaction (single request)
  // ==============================
  async function handleCreateTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    // Prevent double-click in Strict Mode (or repeated calls)
    if (creatingRef.current) {
      console.log("Skipping transaction creation; already creating...");
      return;
    }
    creatingRef.current = true;

    try {
      // 1) Determine product_id or product_name
      let finalProductId: number | undefined;
      let finalProductName: string | undefined;
      if (selectedProduct) {
        finalProductId = selectedProduct.id;
      } else if (productInput.trim()) {
        finalProductName = productInput.trim();
      } else {
        console.log("No product selected or typed. Cannot create transaction.");
        return;
      }

      // 2) Determine product_price_id or amount
      let finalPriceId: number | undefined;
      let finalAmount: number | undefined;

      if (selectedPrice) {
        // User picked an existing ProductPrice
        finalPriceId = selectedPrice.id;
      } else if (priceInput.trim()) {
        // User typed a new price
        const parsedFloat = parseFloat(priceInput.trim());
        if (!isNaN(parsedFloat) && parsedFloat > 0) {
          finalAmount = parsedFloat; // We'll send a float to the backend
        } else {
          console.log("Invalid typed price, cannot create transaction.");
          return;
        }
      } else {
        // Fallback: if user typed something in `txAmount` (manual field)
        if (txAmount.trim()) {
          const parsedFallback = parseFloat(txAmount.trim());
          if (!isNaN(parsedFallback) && parsedFallback > 0) {
            finalAmount = parsedFallback;
          } else {
            console.log("Invalid fallback amount, cannot create transaction.");
            return;
          }
        } else {
          console.log(
            "No existing or new price was provided. Cannot create transaction.",
          );
          return;
        }
      }

      // 3) Build final payload
      const dateStr = txDate.format("YYYY-MM-DDTHH:mm:ss");
      const payload: TransactionPayload = {
        product_id: finalProductId,
        product_name: finalProductName,
        product_price_id: finalPriceId,
        amount: finalAmount, // Only if we're creating a new product_price
        transaction_type: txType,
        description: txDescription.trim(),
        date: dateStr,
      };

      // 4) Call createTransaction (single backend request)
      const success = await createTransaction(token, payload);
      if (success) {
        console.log("Transaction created. Refreshing...");
        handleRefreshTransactions();

        // Reset form
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
    } finally {
      // Unlock
      creatingRef.current = false;
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

      {/* List existing transactions */}
      {transactions.map((tx) => (
        <Box key={tx.id} sx={{ mb: 1 }}>
          <Typography variant="body2">
            ID: {tx.id}, product_id: {tx.product_id}, type:{" "}
            {tx.transaction_type}, amount: {tx.amount}, desc: {tx.description},
            date: {tx.date}
          </Typography>
        </Box>
      ))}

      {/* Form to create a new transaction */}
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

        {/* Fallback manual numeric amount (float) */}
        <TextField
          label="Fallback Amount (float)"
          variant="outlined"
          size="small"
          value={txAmount}
          onChange={(e) => setTxAmount(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        {/* Autocomplete for existing or new Price */}
        <AutocompleteMui<ProductPrice>
          items={prices}
          getOptionLabel={(option) => {
            if (typeof option === "string") {
              return option; // typed user string
            }
            return String(option.price); // existing ProductPrice
          }}
          onSelect={(val) => {
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

        {/* Product (existing or new) */}
        <Typography variant="subtitle1" sx={{ mt: 1 }}>
          Select or Type Product (required)
        </Typography>
        <AutocompleteMui<Product>
          items={products}
          getOptionLabel={(option) => {
            if (typeof option === "string") {
              return option;
            }
            return option.name;
          }}
          onSelect={(val) => {
            if (!val) {
              // cleared
              setSelectedProduct(null);
              setProductInput("");
            } else if (typeof val === "string") {
              // typed new product
              setSelectedProduct(null);
              setProductInput(val);
            } else {
              // existing product
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
