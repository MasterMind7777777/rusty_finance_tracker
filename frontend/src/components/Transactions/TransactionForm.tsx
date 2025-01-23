import React, { useState, useRef } from "react";
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

import { createTransaction } from "../../services/TransactionService";
import { ProductPrice } from "../../types/price";
import { Product } from "../../types/product";
import { TransactionPayload } from "../../types/transaction";
import { AutocompleteMui } from "../Autocomplete/Autocomplete";

/**
 * Match your expanded backend response, e.g.:
 * {
 *   transaction: Transaction,
 *   product: Product,
 *   product_price: ProductPrice
 * }
 */
interface CreateTransactionResponse {
  transaction: any; // or your 'Transaction' interface
  product: Product;
  product_price: ProductPrice;
}

interface TransactionFormProps {
  token: string;
  products: Product[];
  prices: ProductPrice[];
  /** Now it accepts the FULL expanded data */
  onTransactionCreated?: (data: CreateTransactionResponse) => void;
}

export function TransactionForm({
  token,
  products,
  prices,
  onTransactionCreated,
}: TransactionFormProps) {
  // Local form state
  const [txType, setTxType] = useState<"Income" | "Expense">("Expense");
  const [txPrice, setTxPrice] = useState(""); // fallback typed price (float)
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState<Dayjs>(dayjs());

  // Product state
  const [productInput, setProductInput] = useState(""); // typed product name
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Price state
  const [priceInput, setPriceInput] = useState(""); // typed price if new
  const [selectedPrice, setSelectedPrice] = useState<ProductPrice | null>(null);

  // Avoid double creation in Strict Mode
  const creatingRef = useRef(false);

  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

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

      // 2) Determine product_price_id or price
      let finalPriceId: number | undefined;
      let finalAmount: number | undefined;

      if (selectedPrice) {
        // User picked an existing ProductPrice
        finalPriceId = selectedPrice.id;
      } else if (priceInput.trim()) {
        // User typed a new price
        const parsedFloat = parseFloat(priceInput.trim());
        if (!isNaN(parsedFloat) && parsedFloat > 0) {
          finalAmount = parsedFloat; // We'll send a float; backend converts to cents
        } else {
          console.log("Invalid typed price, cannot create transaction.");
          return;
        }
      } else if (txPrice.trim()) {
        // Fallback: user typed something in `txAmount`
        const parsedFallback = parseFloat(txPrice.trim());
        if (!isNaN(parsedFallback) && parsedFallback > 0) {
          finalAmount = parsedFallback;
        } else {
          console.log("Invalid fallback price, cannot create transaction.");
          return;
        }
      } else {
        console.log(
          "No existing/new price was provided. Cannot create transaction.",
        );
        return;
      }

      // 3) Build final payload
      const dateStr = txDate.format("YYYY-MM-DDTHH:mm:ss");
      const payload: TransactionPayload = {
        product_id: finalProductId,
        product_name: finalProductName,
        product_price_id: finalPriceId,
        price: finalAmount,
        transaction_type: txType,
        description: txDescription.trim(),
        date: dateStr,
      };

      // 4) Single request to create transaction
      //    (Assuming this returns the full expanded response)
      const responseData = await createTransaction(token, payload);

      if (responseData) {
        console.log("Transaction created successfully:", responseData);

        // 5) Notify parent with the entire expanded response
        onTransactionCreated?.(responseData);

        // 6) (Partially) Reset form fields as desired:
        //    We DO NOT clear the selected product/price to avoid "No product" on second click
        setTxType("Expense");
        setTxPrice("");
        setTxDescription("");
        setTxDate(dayjs());

        // Instead of null, set them to the newly created or existing references:
        setSelectedProduct(responseData.product);
        setProductInput(responseData.product.name);

        setSelectedPrice(responseData.product_price);
      }
    } catch (err) {
      console.error("Error creating transaction:", err);
    } finally {
      creatingRef.current = false;
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
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

      {/* Fallback manual numeric price (float) */}
      <TextField
        label="Fallback Amount (float)"
        variant="outlined"
        size="small"
        value={txPrice}
        onChange={(e) => setTxPrice(e.target.value)}
        sx={{ mb: 2, width: "300px" }}
      />

      {/* Autocomplete for existing/new Price */}
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
            setSelectedPrice(null);
            setPriceInput("");
          } else if (typeof val === "string") {
            setSelectedPrice(null);
            setPriceInput(val);
          } else {
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

      {/* Date Picker */}
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Transaction Date"
          value={txDate}
          onChange={(newValue) => {
            if (newValue) setTxDate(newValue);
          }}
          sx={{ mb: 2, width: "300px" }}
        />
      </LocalizationProvider>

      {/* Product selection/autocomplete */}
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
  );
}
