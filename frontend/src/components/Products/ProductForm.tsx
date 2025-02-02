// src/components/Products/ProductForm.tsx
import React, { useState } from "react";
import { Box, Typography, Button, TextField, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2"; // Grid v2 import in MUI v6+
import { createProduct } from "../../services/ProductService";
import type { Product } from "../../types/product";

interface ProductFormProps {
  token: string;
  onProductCreated: (newProduct: Product) => void;
}

export function ProductForm({ token, onProductCreated }: ProductFormProps) {
  const [productName, setProductName] = useState("");

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) {
      console.log("Product name is empty, please enter a name.");
      return;
    }
    try {
      const newProd = await createProduct(token, { name: productName });
      if (!newProd) {
        console.error("Product creation failed.");
        return;
      }
      onProductCreated(newProd);
      setProductName("");
    } catch (error) {
      console.error("Error creating product:", error);
    }
  }

  return (
    <Paper sx={{ p: 2, mt: 3 }} elevation={3}>
      <Box component="form" onSubmit={handleCreateProduct}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create a New Product
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Product Name"
              variant="outlined"
              size="small"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button variant="contained" type="submit">
              Create Product
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
