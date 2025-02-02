import { useEffect, useState } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { fetchCategories } from "../services/CategoryService";
import { useAuth } from "../contexts/AuthContext";
import type { Category } from "../types/category";
import { CategoryList } from "../components/Categories/CategoryList";
import { CategoryForm } from "../components/Categories/CategoryForm";

export default function CategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);

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

  function handleCategoryCreated(newCategory: Category) {
    setCategories((prev) => [...prev, newCategory]);
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">Categories</Typography>
        <Button
          variant="contained"
          onClick={handleRefreshCategories}
          startIcon={<RefreshIcon />}
        >
          Refresh Categories
        </Button>
      </Stack>
      <CategoryList categories={categories} />
      <CategoryForm
        token={token || ""}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
      />
    </Box>
  );
}
