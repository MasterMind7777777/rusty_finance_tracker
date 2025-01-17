import { buildUrl, getAuthHeaders } from "./api";
import type { Product, ProductPayload } from "../types/product";

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

export async function createProduct(
  token: string,
  payload: ProductPayload,
): Promise<boolean> {
  const res = await fetch(buildUrl("/products"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("Product creation error:", await res.text());
    return false;
  }
  return true;
}
