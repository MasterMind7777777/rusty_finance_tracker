import { buildUrl, getAuthHeaders } from "./api";
import type {
  CreateProductResponse,
  Product,
  ProductPayload,
} from "../types/product";

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
 * Create a new product and return the full creation response, including
 * the product and its associated category (if any).
 */
export async function createProduct(
  token: string,
  payload: ProductPayload,
): Promise<CreateProductResponse | null> {
  const res = await fetch(buildUrl("/products"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("Product creation error:", await res.text());
    return null;
  }

  // The response now includes both the product and (if available) its category.
  const data = await res.json();
  return data as CreateProductResponse;
}
