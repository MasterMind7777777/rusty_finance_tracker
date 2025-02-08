import React, { useState } from "react";
import { Box, Typography, Button, TextField, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2"; // Grid v2 import in MUI v6+
import { createProduct } from "../../services/ProductService";
import type {
  CreateProductResponse,
  ProductPayload,
} from "../../types/product";
import type { Category } from "../../types/category";
import { AutocompleteMui } from "../Autocomplete/Autocomplete";

interface ProductFormProps {
  token: string;
  onProductCreated: (response: CreateProductResponse) => void;
  categories: Category[];
}

export function ProductForm({
  token,
  onProductCreated,
  categories,
}: ProductFormProps) {
  const [productName, setProductName] = useState("");
  // This state can hold either an existing Category object or a free-typed string.
  const [selectedCategory, setSelectedCategory] = useState<
    Category | string | null
  >(null);

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) {
      console.log("Product name is empty, please enter a name.");
      return;
    }
    // Build the payload with either category_id or category_name.
    const payload: ProductPayload = { name: productName };
    if (selectedCategory) {
      if (typeof selectedCategory === "string") {
        payload.category_name = selectedCategory.trim();
      } else {
        payload.category_id = selectedCategory.id;
      }
    }
    try {
      const response = await createProduct(token, payload);
      if (!response) {
        console.error("Product creation failed.");
        return;
      }
      onProductCreated(response);
      setProductName("");
      setSelectedCategory(null);
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
            <AutocompleteMui<Category>
              items={categories}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.name
              }
              onSelect={(val) => {
                setSelectedCategory(val);
              }}
              onInputChange={(val) => {
                // Update the selectedCategory with free text as the user types.
                setSelectedCategory(val);
              }}
              label="Category"
              allowNewValue
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
