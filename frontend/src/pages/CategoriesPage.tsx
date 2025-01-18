import React, { useEffect, useState, useRef } from "react";
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
  const [parentCategoryInput, setParentCategoryInput] = useState<string>("");

  // This ref prevents double‐creation if StrictMode triggers the same callback twice quickly.
  const creatingRef = useRef(false);

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
    try {
      const data = await fetchCategories(token);
      setCategories(data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }

  /**
   * Ensure a parent category exists if the user typed one, but didn't select it from the list.
   * If parentCategory is already set, we reuse it; otherwise, we create a new one from parentCategoryInput.
   */
  async function ensureParentCategory(): Promise<Category | null> {
    if (!token) return null;

    // If we already have a selected parent category, use it
    if (parentCategory) {
      return parentCategory;
    }

    // If there's a typed parent name but no selected category, create a new parent
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
          creatingRef.current = false; // Reset so user can try again
          return null;
        }

        // Push new parent into local state
        setCategories((prev) => [...prev, createdParent]);
        // Mark it as the current parent category
        setParentCategory(createdParent);
        return createdParent;
      } catch (err) {
        console.error("Error creating parent category from input:", err);
        return null;
      } finally {
        creatingRef.current = false; // Allow future creations
      }
    }

    // If no parent typed or selected, return null
    return null;
  }

  /**
   * Called when the user submits the "create category" form
   */
  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    // Disallow blank category names
    if (!categoryName.trim()) {
      console.error("Cannot create a category with an empty name");
      return;
    }

    try {
      // Ensure we have a parent (if user typed one)
      const parent = await ensureParentCategory();

      // Build the payload for creating the new child category
      const payload: CategoryPayload = {
        name: categoryName.trim(),
        parent_category_id: parent?.id || parentCategory?.id || null,
      };

      // Create the child category
      const newCat = await createCategory(token, payload);
      if (!newCat) {
        console.error("Failed to create category");
        return;
      }
      setCategories([...categories, newCat]);

      // Reset so we don't reuse the same parent next time
      setParentCategory(null);
      setParentCategoryInput("");
      setCategoryName("");
    } catch (err) {
      console.error("Error creating category:", err);
    }
  }

  /**
   * Called when user selects or types in the Autocomplete for "parent category"
   */
  async function handleSelectParent(selected: Category | string | null) {
    if (!token) return;

    // User cleared the parent
    if (!selected) {
      setParentCategory(null);
      setParentCategoryInput("");
      return;
    }

    // User typed a new parent name
    if (typeof selected === "string") {
      setParentCategoryInput(selected);
    } else {
      // User picked an existing category
      setParentCategory(selected);
      setParentCategoryInput("");
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

      {/* List existing categories */}
      {categories.map((cat) => (
        <Box key={cat.id} sx={{ mb: 1 }}>
          <Typography variant="body1">
            ID: {cat.id}, Name: {cat.name}, Parent ID:{" "}
            {cat.parent_category_id ?? "None"}
          </Typography>
        </Box>
      ))}

      <Box component="form" onSubmit={handleCreateCategory} sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Create a new category
        </Typography>

        {/* Category Name */}
        <TextField
          label="Category Name"
          variant="outlined"
          size="small"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          sx={{ mb: 2, width: "300px" }}
        />

        {/* Autocomplete for choosing OR creating a new parent category */}
        <AutocompleteMui<Category>
          items={categories}
          getOptionLabel={(cat) =>
            typeof cat === "object" && "name" in cat ? cat.name : String(cat)
          }
          onSelect={handleSelectParent} // When an item is selected
          onInputChange={(value: string) => setParentCategoryInput(value)}
          label="Parent Category (optional)"
          allowNewValue={true}
        />

        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
          Create Category
        </Button>
      </Box>
    </Box>
  );
}
