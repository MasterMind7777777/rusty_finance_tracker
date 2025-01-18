import { buildUrl, getAuthHeaders } from "./api";
import type { Product, ProductPayload } from "../types/product";

/**
 * Fetch all products
 */
export async function fetchProducts(token: string): Promise<Product[]> {
  const res = await fetch(buildUrl("/products"), {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    console.error("Error fetching products:", await res.text());
    return [];
  }
  return (await res.json()) as Product[];
}

/**
 * Create a new product and return the newly created Product object
 */
export async function createProduct(
  token: string,
  payload: ProductPayload,
): Promise<Product | null> {
  const res = await fetch(buildUrl("/products"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("Product creation error:", await res.text());
    return null;
  }

  // Expect a JSON response containing the newly created product
  const data = await res.json();
  return data as Product;
}
