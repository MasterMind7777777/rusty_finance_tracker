import React, { useEffect, useState } from "react";
import { fetchProducts, createProduct } from "../services/ProductService";
import { useAuth } from "../contexts/AuthContext";
import type { Product } from "../types/product";

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState("");

  useEffect(() => {
    if (token) {
      handleRefreshProducts();
    }
  }, [token]);

  async function handleRefreshProducts() {
    if (!token) {
      console.log("No token, can't fetch products.");
      return;
    }
    const data = await fetchProducts(token);
    setProducts(data);
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      console.log("No token, please log in.");
      return;
    }
    const success = await createProduct(token, { name: productName });
    if (success) {
      console.log("Product created. Refreshing...");
      handleRefreshProducts();
    }
  }

  return (
    <div>
      <h2>Products</h2>
      <button onClick={handleRefreshProducts}>Refresh Products</button>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            ID: {p.id}, Name: {p.name}, user_id: {p.user_id}
          </li>
        ))}
      </ul>

      <hr />
      <h3>Create a new product</h3>
      <form onSubmit={handleCreateProduct}>
        <label>Product name:</label>
        <br />
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
        />
        <br />
        <button type="submit">Create Product</button>
      </form>
    </div>
  );
}
