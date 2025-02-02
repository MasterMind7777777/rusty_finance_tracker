import { useEffect, useState } from "react";
import { fetchProducts } from "../services/ProductService";
import { useAuth } from "../contexts/AuthContext";
import type { Product } from "../types/product";
import { Box, Typography, Button, Stack } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ProductList } from "../components/Products/ProductList";
import { ProductForm } from "../components/Products/ProductForm";

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (token) {
      handleRefreshProducts();
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

  function handleProductCreated(newProduct: Product) {
    // Add the newly created product to the list
    setProducts((prev) => [...prev, newProduct]);
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
      <ProductList products={products} />
      <ProductForm
        token={token || ""}
        onProductCreated={handleProductCreated}
      />
    </Box>
  );
}
