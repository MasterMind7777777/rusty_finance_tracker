import { buildUrl, getAuthHeaders } from "./api";
import type { NewProductPrice, ProductPrice } from "../types/price";

export async function fetchProductPrices(
  token: string,
): Promise<ProductPrice[]> {
  const res = await fetch(buildUrl("/product_prices"), {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    console.error("Error fetching product prices:", await res.text());
    return [];
  }

  return await res.json();
}

export async function createProductPrice(
  token: string,
  payload: NewProductPrice,
): Promise<ProductPrice | null> {
  const res = await fetch(buildUrl("/product_prices"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Product price creation error:", await res.text());
    return null;
  }

  return await res.json();
}
