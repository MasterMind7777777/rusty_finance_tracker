import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  Alert,
  FormControl,
  InputLabel,
  FormHelperText,
} from "@mui/material";
import Grid from "@mui/material/Grid2"; // Grid v2 import in MUI v6+
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";

import { createTransaction } from "../../services/TransactionService";
import { ProductPrice } from "../../types/price";
import { Product } from "../../types/product";
import {
  CreatedTransaction,
  TransactionPayload,
} from "../../types/transaction";
import { AutocompleteMui } from "../Autocomplete/Autocomplete";
import { Tag } from "../../types/tag";
import { AutocompleteMuiMultiple } from "../Autocomplete/AutocompleteMulti";

interface TransactionFormCreateResponse {
  transaction: CreatedTransaction;
  product: Product;
  product_price: ProductPrice;
  tags: Tag[] | null;
}

interface TransactionFormProps {
  token: string;
  products: Product[];
  prices: ProductPrice[];
  tags: Tag[] | null;
  onTransactionCreated?: (data: TransactionFormCreateResponse) => void;
}

export function TransactionForm({
  token,
  products,
  prices,
  tags,
  onTransactionCreated,
}: TransactionFormProps) {
  const [txType, setTxType] = useState<"Income" | "Expense">("Expense");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState<Dayjs>(dayjs());

  const [productInput, setProductInput] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [priceInput, setPriceInput] = useState("");
  const [selectedPrice, setSelectedPrice] = useState<ProductPrice | null>(null);
  const [priceError, setPriceError] = useState("");

  const [tagsValue, setTagsValue] = useState<Tag[]>([]); // Store selected tags
  const [newTagsValue, setNewTagsValue] = useState<string[]>([]); // Store newly created tags
  const [errorMessage, setErrorMessage] = useState("");
  const creatingRef = useRef(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (creatingRef.current) {
      console.log("Already creating a transaction; skipping...");
      return;
    }
    creatingRef.current = true;
    setErrorMessage("");

    try {
      // 1) Determine product_id or product_name
      let finalProductId: number | undefined;
      let finalProductName: string | undefined;

      if (selectedProduct) {
        finalProductId = selectedProduct.id;
      } else if (productInput.trim()) {
        finalProductName = productInput.trim();
      } else {
        throw new Error("Please select or type a product name.");
      }

      // 2) Determine product_price_id or typed price
      let finalPriceId: number | undefined;
      let finalAmount: number | undefined;

      if (selectedPrice) {
        // Reuse existing ProductPrice
        finalPriceId = selectedPrice.id;
      } else if (priceInput.trim()) {
        // Typed in a new numeric price
        const parsed = parseFloat(priceInput);
        if (isNaN(parsed) || parsed <= 0) {
          throw new Error("Invalid typed price. Must be a positive number.");
        }
        finalAmount = parsed;
      } else {
        throw new Error("Please select or type a price.");
      }

      // combine tagsValue and newTagsValue into id ints new string
      const tagsValueIds = [...tagsValue.map((tag) => tag.id), ...newTagsValue];

      const payload: TransactionPayload = {
        product_id: finalProductId,
        product_name: finalProductName,
        product_price_id: finalPriceId,
        price: finalAmount,
        transaction_type: txType,
        description: txDescription.trim(),
        date: txDate.format("YYYY-MM-DDTHH:mm:ss"),
        tags: tagsValueIds,
      };

      const responseData = await createTransaction(token, payload);
      if (responseData) {
        onTransactionCreated?.({
          transaction: responseData.transaction,
          product: responseData.product,
          product_price: responseData.product_price,
          tags: responseData.tags,
        });
        // Reset fields
        setTxType("Expense");
        setTxDescription("");
        setTxDate(dayjs());
        setSelectedProduct(responseData.product);
        setProductInput(responseData.product.name);
        setSelectedPrice(responseData.product_price);
        setPriceInput("");
        setPriceError("");
        setTagsValue([]); // Reset selected tags
      }
    } catch (err: any) {
      console.error("Error creating transaction:", err);
      setErrorMessage(err.message || "Something went wrong.");
    } finally {
      creatingRef.current = false;
    }
  }

  /** Validate typed price in real time */
  function handlePriceInputChange(newVal: string) {
    setPriceInput(newVal);
    if (!newVal) {
      setPriceError("");
      return;
    }
    const parsed = parseFloat(newVal);
    if (isNaN(parsed) || parsed < 0) {
      setPriceError("Please enter a valid positive number.");
    } else {
      setPriceError("");
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Create a New Transaction
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Row 1: Transaction Type, Price */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="transaction-type-label">
              Transaction Type
            </InputLabel>
            <Select
              labelId="transaction-type-label"
              label="Transaction Type"
              value={txType}
              onChange={(e) =>
                setTxType(e.target.value as "Income" | "Expense")
              }
            >
              <MenuItem value="Expense">Expense</MenuItem>
              <MenuItem value="Income">Income</MenuItem>
            </Select>
            <FormHelperText>
              Select if this is an expense or income.
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteMui<ProductPrice>
            items={prices}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : String(option.price)
            }
            onSelect={(val) => {
              if (!val) {
                setSelectedPrice(null);
                setPriceInput("");
                setPriceError("");
              } else if (typeof val === "string") {
                setSelectedPrice(null);
                setPriceInput(val);
              } else {
                setSelectedPrice(val);
                setPriceInput("");
                setPriceError("");
              }
            }}
            onInputChange={handlePriceInputChange}
            label="Price"
            allowNewValue
          />
          {priceError && <FormHelperText error>{priceError}</FormHelperText>}
        </Grid>

        {/* Row 2: Description, Date */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Description"
            variant="outlined"
            size="small"
            fullWidth
            value={txDescription}
            onChange={(e) => setTxDescription(e.target.value)}
            helperText="Optional: Add notes about this transaction."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Transaction Date"
              value={txDate}
              onChange={(newValue) => {
                if (newValue) setTxDate(newValue);
              }}
              slotProps={{
                textField: {
                  size: "small",
                  fullWidth: true,
                  helperText: "Choose the date of this transaction.",
                },
              }}
            />
          </LocalizationProvider>
        </Grid>

        {/* Row 3: Product Autocomplete */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <AutocompleteMui<Product>
            items={products}
            getOptionLabel={(option) =>
              typeof option === "string" ? option : option.name
            }
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
            onInputChange={(val) => setProductInput(val)}
            label="Product"
            allowNewValue
          />
        </Grid>

        {/* Row 4: Tags */}
        <Grid size={{ xs: 12 }}>
          <AutocompleteMuiMultiple<Tag>
            value={tagsValue}
            onChange={setTagsValue}
            items={tags || []}
            newValues={newTagsValue}
            onNewValuesChange={setNewTagsValue}
            getOptionLabel={(tag) => (typeof tag === "string" ? tag : tag.name)}
            label="Select Tags"
            allowNewValue
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          type="submit"
          disabled={Boolean(priceError)}
        >
          Create Transaction
        </Button>
      </Box>
    </Box>
  );
}
