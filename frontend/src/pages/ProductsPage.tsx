import React, { useEffect, useState } from "react";
import { fetchProducts, createProduct } from "../services/ProductService";
import { useAuth } from "../contexts/AuthContext";
import type { Product } from "../types/product";
import { Box, Typography, Button, TextField } from "@mui/material";

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState("");

  useEffect(() => {
    if (token) {
      handleRefreshProducts();
    }
  }, [token]);

  async function handleRefreshProducts() {
    if (!token) {
      console.log("No token, can't fetch products.");
      return;
    }
    const data = await fetchProducts(token);
    setProducts(data);
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      console.log("No token, please log in.");
      return;
    }
    const success = await createProduct(token, { name: productName });
    if (success) {
      console.log("Product created. Refreshing...");
      handleRefreshProducts();
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Products
      </Typography>

      <Button
        variant="contained"
        onClick={handleRefreshProducts}
        sx={{ mb: 2 }}
      >
        Refresh Products
      </Button>

      {/* List existing products */}
      {products.map((p) => (
        <Box key={p.id} sx={{ mb: 1 }}>
          <Typography variant="body2">
            ID: {p.id}, Name: {p.name}, user_id: {p.user_id}
          </Typography>
        </Box>
      ))}

      <Box component="form" onSubmit={handleCreateProduct} sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Create a new product
        </Typography>

        <TextField
          label="Product Name"
          variant="outlined"
          size="small"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        <Button variant="contained" type="submit">
          Create Product
        </Button>
      </Box>
    </Box>
  );
}
