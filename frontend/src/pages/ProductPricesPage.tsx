// src/pages/ProductPricesPage.tsx
import { useEffect, useState } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { fetchProductPrices } from "../services/PriceService";
import { fetchProducts } from "../services/ProductService";
import { ProductPriceList } from "../components/ProductPrices/ProductPriceList";
import { ProductPriceForm } from "../components/ProductPrices/ProductPriceForm";
import type { Product } from "../types/product";
import type {
  ProductPriceDto,
  CreateProductPriceResponse,
} from "../types/price";

export default function ProductPricesPage() {
  const { token } = useAuth();
  const [prices, setPrices] = useState<ProductPriceDto[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token]);

  async function refreshData() {
    await Promise.all([handleRefreshPrices(), handleRefreshProducts()]);
  }

  async function handleRefreshPrices() {
    if (!token) return;
    try {
      const data = await fetchProductPrices(token);
      setPrices(data);
    } catch (error) {
      console.error("Error fetching product prices:", error);
    }
  }

  async function handleRefreshProducts() {
    if (!token) return;
    try {
      const data = await fetchProducts(token);
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }

  // Use the response returned by createProductPrice to update state.
  function handlePriceCreated(response: CreateProductPriceResponse) {
    // Append the new product price.
    setPrices((prev) => [...prev, response.product_price]);
    // If the new product (from the response) isn’t already in our list, add it.
    setProducts((prev) => {
      if (!prev.some((p) => p.id === response.product.id)) {
        return [...prev, response.product];
      }
      return prev;
    });
  }

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">Product Prices</Typography>
        <Button variant="contained" onClick={handleRefreshPrices}>
          Refresh Prices
        </Button>
      </Stack>
      <ProductPriceList prices={prices} products={products} />
      <ProductPriceForm
        token={token || ""}
        products={products}
        onPriceCreated={handlePriceCreated}
      />
    </Box>
  );
}
