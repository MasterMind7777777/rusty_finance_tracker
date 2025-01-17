import React, { useEffect, useState } from "react";
import {
  fetchProductPrices,
  createProductPrice,
} from "../services/PriceService";
import { useAuth } from "../contexts/AuthContext";
import { fetchProducts } from "../services/ProductService";
import type { Product } from "../types/product";
import type { ProductPrice } from "../types/price";
import { Autocomplete } from "../components/Autocomplete/Autocomplete";

export default function ProductPricesPage() {
  const { token } = useAuth();
  const [prices, setPrices] = useState<ProductPrice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null,
  );
  const [priceVal, setPriceVal] = useState("");
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    if (token) {
      handleRefreshPrices();
      handleRefreshProducts();
    }
  }, [token]);

  async function handleRefreshPrices() {
    if (!token) return;
    const data = await fetchProductPrices(token);
    setPrices(data);
  }

  async function handleRefreshProducts() {
    if (!token) return;
    const data = await fetchProducts(token);
    setProducts(data);
  }

  async function handleCreatePrice(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      console.log("No token, please log in.");
      return;
    }
    if (!selectedProductId) {
      console.log("No product selected.");
      return;
    }

    const success = await createProductPrice(token, {
      product_id: selectedProductId,
      price: Number(priceVal),
      created_at: startDate,
    });
    if (success) {
      console.log("Price created. Refreshing...");
      handleRefreshPrices();
    }
  }

  return (
    <div>
      <h2>Product Prices</h2>
      <button onClick={handleRefreshPrices}>Refresh Prices</button>
      <ul>
        {prices.map((pp) => (
          <li key={pp.id}>
            ID: {pp.id}, product_id: {pp.product_id}, price: {pp.price},
            created_at: {pp.created_at}, end_date: {pp.end_date ?? "N/A"}
          </li>
        ))}
      </ul>

      <hr />
      <h3>Create a new product price</h3>
      <label>Select Product:</label>
      <Autocomplete<Product>
        items={products}
        placeholder="Type product name..."
        getLabel={(p) => p.name}
        getId={(p) => p.id || 0}
        onSelect={(id) => setSelectedProductId(id)}
      />
      <br />
      <label>Price (number):</label>
      <input
        type="text"
        value={priceVal}
        onChange={(e) => setPriceVal(e.target.value)}
      />
      <br />
      <label>Start Date (YYYY-MM-DD):</label>
      <input
        type="text"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
      <br />
      <button onClick={handleCreatePrice}>Create Product Price</button>
    </div>
  );
}
