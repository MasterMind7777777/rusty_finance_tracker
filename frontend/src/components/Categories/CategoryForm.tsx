import React, { useState } from "react";
import { Box, Typography, Button, TextField, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2"; // Grid v2 import in MUI v6+
import { AutocompleteMui } from "../Autocomplete/Autocomplete";
import { createCategory } from "../../services/CategoryService";
import type {
  CreateCategoryResponse,
  Category,
  CategoryPayload,
} from "../../types/category";

interface CategoryFormProps {
  token: string;
  categories: Category[];
  onCategoryCreated: (response: CreateCategoryResponse) => void;
}

export function CategoryForm({
  token,
  categories,
  onCategoryCreated,
}: CategoryFormProps) {
  const [categoryName, setCategoryName] = useState("");
  // This state holds either an existing parent Category object or a free-typed string.
  const [selectedParent, setSelectedParent] = useState<
    Category | string | null
  >(null);

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!categoryName.trim()) {
      console.error("Cannot create a category with an empty name");
      return;
    }
    // Build the payload with either parent_category_id or parent_category_name.
    const payload: CategoryPayload = { name: categoryName.trim() };
    if (selectedParent) {
      if (typeof selectedParent === "string") {
        payload.parent_category_name = selectedParent.trim();
      } else {
        payload.parent_category_id = selectedParent.id;
      }
    }
    try {
      const response = await createCategory(token, payload);
      if (!response) {
        console.error("Failed to create category");
        return;
      }
      onCategoryCreated(response);
      setCategoryName("");
      setSelectedParent(null);
    } catch (err) {
      console.error("Error creating category:", err);
    }
  }

  return (
    <Paper sx={{ p: 2, mt: 3 }} elevation={3}>
      <Box component="form" onSubmit={handleCreateCategory}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Create a New Category
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Category Name"
              variant="outlined"
              size="small"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <AutocompleteMui<Category>
              items={categories}
              getOptionLabel={(option) =>
                typeof option === "string" ? option : option.name
              }
              onSelect={(val) => setSelectedParent(val)}
              onInputChange={(val) => setSelectedParent(val)}
              label="Parent Category (optional)"
              allowNewValue
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Button type="submit" variant="contained" sx={{ mt: 2 }}>
              Create Category
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
}
