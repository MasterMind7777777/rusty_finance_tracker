import React, { useEffect, useState } from "react";
import { fetchCategories, createCategory } from "../services/CategoryService";
import { useAuth } from "../contexts/AuthContext";
import type { Category, CategoryPayload } from "../types/category";
import { Box, Typography, Button, TextField } from "@mui/material";
import { AutocompleteMui } from "../components/Autocomplete/Autocomplete";

export default function CategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [parentCategory, setParentCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (token) {
      handleRefreshCategories();
    }
  }, [token]);

  async function handleRefreshCategories() {
    if (!token) {
      console.log("No token, can't fetch categories.");
      return;
    }
    const data = await fetchCategories(token);
    setCategories(data);
  }

  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      console.log("No token, please log in.");
      return;
    }
    const payload: CategoryPayload = {
      name: categoryName,
      parent_category_id: parentCategory?.id,
    };
    const success = await createCategory(token, payload);
    if (success) {
      console.log("Category created. Refreshing...");
      handleRefreshCategories();
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Categories
      </Typography>

      <Button
        variant="contained"
        onClick={handleRefreshCategories}
        sx={{ mb: 2 }}
      >
        Refresh Categories
      </Button>

      {/* List categories */}
      {categories.map((cat) => (
        <Box key={cat.id} sx={{ mb: 1 }}>
          <Typography variant="body1">
            ID: {cat.id}, Name: {cat.name}, Parent: {cat.parent_id ?? "None"}
          </Typography>
        </Box>
      ))}

      <Box component="form" onSubmit={handleCreateCategory} sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Create a new category
        </Typography>

        <TextField
          label="Category Name"
          variant="outlined"
          size="small"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        <AutocompleteMui<Category>
          items={categories}
          getOptionLabel={(cat) =>
            typeof cat === "object" && "name" in cat ? cat.name : String(cat)
          }
          onSelect={(selectedCat) => setParentCategory(selectedCat)}
          label="Parent Category (optional)"
        />

        <Button type="submit" variant="contained">
          Create Category
        </Button>
      </Box>
    </Box>
  );
}
