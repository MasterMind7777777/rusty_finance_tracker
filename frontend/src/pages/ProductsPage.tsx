// src/pages/ProductsPage.tsx
import { useEffect, useState } from "react";
import { fetchProducts } from "../services/ProductService";
import { fetchCategories } from "../services/CategoryService";
import { useAuth } from "../contexts/AuthContext";
import type { Product, CreateProductResponse } from "../types/product";
import type { Category } from "../types/category";
import { Box, Typography, Button, Stack } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ProductList } from "../components/Products/ProductList";
import { ProductForm } from "../components/Products/ProductForm";

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (token) {
      handleRefreshProducts();
      handleRefreshCategories();
    }
  }, [token]);

  async function handleRefreshProducts() {
    if (!token) {
      console.error("No token, can't fetch products.");
      return;
    }
    try {
      const data = await fetchProducts(token);
      setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }

  async function handleRefreshCategories() {
    if (!token) {
      console.error("No token, can't fetch categories.");
      return;
    }
    try {
      const cats = await fetchCategories(token);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }

  function handleProductCreated(response: CreateProductResponse) {
    // Update the products list with the newly created product.
    setProducts((prev) => [...prev, response.product]);
    // If a new (or existing) category was returned, update the categories list if needed.
    if (response.category) {
      setCategories((prev) => {
        if (!prev.some((cat) => cat.id === response.category!.id)) {
          return [...prev, response.category];
        }
        return prev;
      });
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">Products</Typography>
        <Button
          variant="contained"
          onClick={handleRefreshProducts}
          startIcon={<RefreshIcon />}
        >
          Refresh Products
        </Button>
      </Stack>
      <ProductList products={products} categories={categories} />
      <ProductForm
        token={token || ""}
        onProductCreated={handleProductCreated}
        categories={categories}
      />
    </Box>
  );
}
