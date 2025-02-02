// src/components/Categories/CategoryForm.tsx
import React, { useState, useRef } from "react";
import { Box, Typography, Button, TextField, Paper } from "@mui/material";
import Grid from "@mui/material/Grid2"; // Grid v2 import in MUI v6+
import { AutocompleteMui } from "../Autocomplete/Autocomplete";
import { createCategory } from "../../services/CategoryService";
import type { Category, CategoryPayload } from "../../types/category";

interface CategoryFormProps {
  token: string;
  categories: Category[];
  onCategoryCreated: (newCategory: Category) => void;
}

export function CategoryForm({
  token,
  categories,
  onCategoryCreated,
}: CategoryFormProps) {
  const [categoryName, setCategoryName] = useState("");
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [parentCategoryInput, setParentCategoryInput] = useState<string>("");

  // Prevent duplicate creation calls in StrictMode
  const creatingRef = useRef(false);

  async function ensureParentCategory(): Promise<Category | null> {
    if (!token) return null;
    // If already selected, reuse the parent category
    if (parentCategory) return parentCategory;
    // If the user typed a parent name but did not select an existing one, create it
    if (parentCategoryInput.trim()) {
      if (creatingRef.current) {
        console.log("Skipping duplicate parent creation call...");
        return null;
      }
      creatingRef.current = true;

      const payload: CategoryPayload = {
        name: parentCategoryInput.trim(),
        parent_category_id: null,
      };

      try {
        const createdParent = await createCategory(token, payload);
        if (!createdParent) {
          console.error("Failed to create parent category");
          creatingRef.current = false;
          return null;
        }
        setParentCategory(createdParent);
        return createdParent;
      } catch (err) {
        console.error("Error creating parent category from input:", err);
        return null;
      } finally {
        creatingRef.current = false;
      }
    }
    return null;
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!categoryName.trim()) {
      console.error("Cannot create a category with an empty name");
      return;
    }
    try {
      // Ensure a parent category exists if the user typed one
      const parent = await ensureParentCategory();

      const payload: CategoryPayload = {
        name: categoryName.trim(),
        parent_category_id: parent?.id || parentCategory?.id || null,
      };

      const newCat = await createCategory(token, payload);
      if (!newCat) {
        console.error("Failed to create category");
        return;
      }
      onCategoryCreated(newCat);
      // Reset fields
      setCategoryName("");
      setParentCategory(null);
      setParentCategoryInput("");
    } catch (err) {
      console.error("Error creating category:", err);
    }
  }

  async function handleSelectParent(selected: Category | string | null) {
    if (!token) return;
    if (!selected) {
      setParentCategory(null);
      setParentCategoryInput("");
      return;
    }
    if (typeof selected === "string") {
      // User typed a new parent category name
      setParentCategoryInput(selected);
    } else {
      // User selected an existing parent category
      setParentCategory(selected);
      setParentCategoryInput("");
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
              getOptionLabel={(cat) =>
                typeof cat === "object" && "name" in cat
                  ? cat.name
                  : String(cat)
              }
              onSelect={handleSelectParent}
              onInputChange={(value: string) => setParentCategoryInput(value)}
              label="Parent Category (optional)"
              allowNewValue={true}
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
