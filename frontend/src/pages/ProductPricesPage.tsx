// src/pages/ProductPricesPage.tsx
import { useEffect, useState } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { fetchProductPrices } from "../services/PriceService";
import { fetchProducts } from "../services/ProductService";
import { ProductPriceList } from "../components/ProductPrices/ProductPriceList";
import { ProductPriceForm } from "../components/ProductPrices/ProductPriceForm";
import type { Product } from "../types/product";
import type { ProductPrice } from "../types/price";

export default function ProductPricesPage() {
  const { token } = useAuth();
  const [prices, setPrices] = useState<ProductPrice[]>([]);
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
      <ProductPriceList prices={prices} />
      <ProductPriceForm
        token={token || ""}
        products={products}
        onPriceCreated={handleRefreshPrices}
      />
    </Box>
  );
}
