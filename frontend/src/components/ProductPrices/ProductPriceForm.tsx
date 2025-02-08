// src/components/ProductPrices/ProductPriceForm.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import Grid from "@mui/material/Grid2"; // Grid v2 import in MUI v6+
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import { AutocompleteMui } from "../Autocomplete/Autocomplete";
import { createProductPrice } from "../../services/PriceService";
import type { Product } from "../../types/product";
import type { CreateProductPriceResponse } from "../../types/price";

interface ProductPriceFormProps {
  token: string;
  products: Product[];
  onPriceCreated?: (response: CreateProductPriceResponse) => void;
}

export function ProductPriceForm({
  token,
  products,
  onPriceCreated,
}: ProductPriceFormProps) {
  const [productInput, setProductInput] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceVal, setPriceVal] = useState("");
  const [createdAt, setCreatedAt] = useState<Dayjs | null>(dayjs());

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success",
  );

  async function handleCreatePrice(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    // Require that either a product is selected or a product name is typed.
    if (!selectedProduct && !productInput.trim()) {
      setSnackbarMessage("Please select or type a product.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const createdAtStr = createdAt
      ? createdAt.format("YYYY-MM-DDTHH:mm:ss")
      : "";
    // Build the payload: if a product was selected, send its ID;
    // otherwise, send the product name so that the backend can create it.
    const payload: any = {
      price: Number(priceVal),
      created_at: createdAtStr,
    };
    if (selectedProduct) {
      payload.product_id = selectedProduct.id;
    } else {
      payload.product_name = productInput.trim();
    }

    try {
      // createProductPrice now returns a CreateProductPriceResponse.
      const response = await createProductPrice(token, payload);
      if (response) {
        setSnackbarMessage("Product price created successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        if (onPriceCreated) {
          onPriceCreated(response);
        }
        // Reset fields.
        setSelectedProduct(null);
        setProductInput("");
        setPriceVal("");
        setCreatedAt(dayjs());
      }
    } catch (error) {
      console.error("Error creating product price:", error);
      setSnackbarMessage("Error creating product price.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  }

  function handleSelectProduct(selected: Product | string | null) {
    if (!selected) {
      setSelectedProduct(null);
      setProductInput("");
      return;
    }
    if (typeof selected === "string") {
      // User typed a new product name.
      setProductInput(selected);
      setSelectedProduct(null);
    } else {
      // User selected an existing product.
      setSelectedProduct(selected);
      setProductInput("");
    }
  }

  function handleCloseSnackbar() {
    setSnackbarOpen(false);
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Create a New Product Price
      </Typography>
      <Box component="form" onSubmit={handleCreatePrice} sx={{ mt: 2 }}>
        <Grid container spacing={2}>
          {/* Product Autocomplete */}
          <Grid size={{ xs: 12 }}>
            <AutocompleteMui<Product>
              items={products}
              getOptionLabel={(p) =>
                typeof p === "object" ? p.name : String(p)
              }
              onSelect={handleSelectProduct}
              onInputChange={(val: string) => setProductInput(val)}
              label="Select or Type Product"
              allowNewValue
            />
          </Grid>
          {/* Price Input */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Price"
              type="number"
              variant="outlined"
              size="small"
              value={priceVal}
              onChange={(e) => setPriceVal(e.target.value)}
              fullWidth
            />
          </Grid>
          {/* Date Picker */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Created At"
                value={createdAt}
                onChange={(newValue) => setCreatedAt(newValue)}
                slotProps={{
                  textField: { size: "small", fullWidth: true },
                }}
              />
            </LocalizationProvider>
          </Grid>
          {/* Submit Button */}
          <Grid size={{ xs: 12 }}>
            <Button variant="contained" type="submit" sx={{ mt: 2 }}>
              Create Product Price
            </Button>
          </Grid>
        </Grid>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
