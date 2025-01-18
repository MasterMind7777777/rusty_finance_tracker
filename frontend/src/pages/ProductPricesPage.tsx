import React, { useEffect, useState } from "react";
import { Box, Typography, Button, TextField } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";

import { useAuth } from "../contexts/AuthContext";
import {
  fetchProductPrices,
  createProductPrice,
} from "../services/PriceService";
import { fetchProducts } from "../services/ProductService";
import type { Product } from "../types/product";
import type { ProductPrice } from "../types/price";
import { AutocompleteMui } from "../components/Autocomplete/Autocomplete";

export default function ProductPricesPage() {
  const { token } = useAuth();

  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Selected product from the autocomplete
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Price numeric input
  const [priceVal, setPriceVal] = useState("");

  // For the date picker, store as a Dayjs object
  // Default to now (dayjs())
  const [createdAt, setCreatedAt] = useState<Dayjs | null>(dayjs());

  useEffect(() => {
    if (token) {
      handleRefreshPrices();
      handleRefreshProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleRefreshPrices() {
    if (!token) return;
    const data = await fetchProductPrices(token);
    setPrices(data);
  }

  async function handleRefreshProducts() {
    if (!token) return;
    const data = await fetchProducts(token);
    setProducts(data);
  }

  async function handleCreatePrice(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      console.log("No token, please log in.");
      return;
    }
    if (!selectedProduct?.id) {
      console.log("No product selected.");
      return;
    }

    // Convert the Dayjs date to a string your backend expects (e.g. YYYY-MM-DD)
    const createdAtStr = createdAt
      ? createdAt.format("YYYY-MM-DDTHH:mm:ss")
      : "";

    const success = await createProductPrice(token, {
      product_id: selectedProduct.id,
      price: Number(priceVal),
      created_at: createdAtStr,
    });

    if (success) {
      console.log("Price created. Refreshing...");
      handleRefreshPrices();
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Product Prices
      </Typography>

      <Button variant="contained" onClick={handleRefreshPrices} sx={{ mb: 2 }}>
        Refresh Prices
      </Button>

      {/* List existing product prices */}
      {prices.map((pp) => (
        <Box key={pp.id} sx={{ mb: 1 }}>
          <Typography variant="body2">
            ID: {pp.id}, product_id: {pp.product_id}, price: {pp.price},
            created_at: {pp.created_at}
          </Typography>
        </Box>
      ))}

      {/* 
        Wrap with LocalizationProvider if your entire app isn't already using it.
        If you have it at a higher level (e.g., in main.tsx or App.tsx),
        you can remove this local wrap.
      */}
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box component="form" onSubmit={handleCreatePrice} sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Create a new product price
          </Typography>

          {/* Autocomplete for selecting the Product object */}
          <AutocompleteMui<Product>
            items={products}
            getOptionLabel={(p) =>
              // Type-safe guard; ensures we handle object or fallback to string
              typeof p === "object" && "name" in p ? p.name : String(p)
            }
            onSelect={(p) => setSelectedProduct(p)}
            label="Select Product"
          />

          <TextField
            label="Price"
            type="number"
            variant="outlined"
            size="small"
            value={priceVal}
            onChange={(e) => setPriceVal(e.target.value)}
            sx={{ mb: 2, width: "300px" }}
          />

          {/* MUI DatePicker for created_at */}
          <DatePicker
            label="Created At"
            value={createdAt}
            onChange={(newValue: Dayjs | null) => setCreatedAt(newValue)}
          />

          <Button variant="contained" type="submit">
            Create Product Price
          </Button>
        </Box>
      </LocalizationProvider>
    </Box>
  );
}
