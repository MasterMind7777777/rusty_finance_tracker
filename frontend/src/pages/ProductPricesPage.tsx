import React, { useEffect, useState, useRef } from "react";
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
import {
  fetchProducts,
  createProduct, // <-- Make sure you have this function implemented
} from "../services/ProductService";
import type { Product } from "../types/product";
import type { ProductPrice } from "../types/price";
import { AutocompleteMui } from "../components/Autocomplete/Autocomplete";

export default function ProductPricesPage() {
  const { token } = useAuth();

  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Track the user’s typed input if they type a new product name
  const [productInput, setProductInput] = useState<string>("");

  // The current selected product (if user picks from the list or new product is created)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Price numeric input
  const [priceVal, setPriceVal] = useState("");

  // For the date picker (defaults to now)
  const [createdAt, setCreatedAt] = useState<Dayjs | null>(dayjs());

  // Prevent double creation in React Strict Mode
  const creatingRef = useRef(false);

  useEffect(() => {
    if (token) {
      handleRefreshPrices();
      handleRefreshProducts();
    }
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

  /**
   * If user typed a new product name (and hasn't selected an existing product),
   * create a product on the fly, store it in local state, and select it.
   */
  async function ensureProduct(): Promise<Product | null> {
    if (!token) return null;

    // If a product is already selected, use that
    if (selectedProduct) {
      return selectedProduct;
    }

    // If user typed something in 'productInput', but hasn't selected a product
    if (productInput.trim()) {
      if (creatingRef.current) {
        console.log("Skipping duplicate product creation call...");
        return null;
      }
      creatingRef.current = true;

      // Create product in the backend
      try {
        // Adjust if your createProduct requires different fields
        const newProd = await createProduct(token, {
          name: productInput.trim(),
        });
        if (!newProd) {
          console.error("Failed to create product");
          creatingRef.current = false;
          return null;
        }
        // Update local product list
        setProducts((prev) => [...prev, newProd]);
        // Select newly created product
        setSelectedProduct(newProd);
        return newProd;
      } catch (err) {
        console.error("Error creating new product:", err);
        return null;
      } finally {
        creatingRef.current = false;
      }
    }

    // If no input or existing product, return null
    return null;
  }

  /**
   * Called when user submits the "create product price" form
   */
  async function handleCreatePrice(e: React.FormEvent) {
    e.preventDefault();

    if (!token) {
      console.log("No token, please log in.");
      return;
    }

    try {
      // Ensure we have a product (existing or newly created)
      const prod = await ensureProduct();
      if (!prod?.id) {
        console.log("No product selected or created, cannot create price.");
        return;
      }

      // Convert Dayjs date to string format your backend expects
      const createdAtStr = createdAt
        ? createdAt.format("YYYY-MM-DDTHH:mm:ss")
        : "";

      // Create the new ProductPrice
      const success = await createProductPrice(token, {
        product_id: prod.id,
        price: Number(priceVal),
        created_at: createdAtStr,
      });

      if (success) {
        console.log("Price created. Refreshing...");
        handleRefreshPrices();

        // Optionally reset form fields
        setSelectedProduct(null);
        setProductInput("");
        setPriceVal("");
        setCreatedAt(dayjs()); // reset to now
      }
    } catch (err) {
      console.error("Error creating product price:", err);
    }
  }

  /**
   * Called when user selects or types in the Autocomplete for "product"
   */
  function handleSelectProduct(selected: Product | string | null) {
    // If user cleared the selection
    if (!selected) {
      setSelectedProduct(null);
      setProductInput("");
      return;
    }

    // If user typed a brand-new product name
    if (typeof selected === "string") {
      // We won't create it right here; we just store the typed value
      setProductInput(selected);
      setSelectedProduct(null);
    } else {
      // user selected an existing product
      setSelectedProduct(selected);
      setProductInput("");
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

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box component="form" onSubmit={handleCreatePrice} sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Create a new product price
          </Typography>

          {/* Autocomplete for selecting OR typing a product */}
          <AutocompleteMui<Product>
            items={products}
            getOptionLabel={(p) =>
              typeof p === "object" && "name" in p ? p.name : String(p)
            }
            onSelect={handleSelectProduct}
            // Track user input in case user typed a brand-new product
            onInputChange={(val: string) => setProductInput(val)}
            label="Select or Type Product"
            allowNewValue={true}
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

          <DatePicker
            label="Created At"
            value={createdAt}
            onChange={(newValue) => setCreatedAt(newValue)}
          />

          <Button variant="contained" type="submit" sx={{ mt: 2 }}>
            Create Product Price
          </Button>
        </Box>
      </LocalizationProvider>
    </Box>
  );
}
