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
  // convert cents to dollars
  const prices = await res.json();
  prices.forEach((price: ProductPrice) => {
    price.price /= 100;
  });
  return prices as ProductPrice[];
}

export async function createProductPrice(
  token: string,
  payload: NewProductPrice,
): Promise<boolean> {
  // get cents from price
  payload.price = Math.round(payload.price * 100);
  const res = await fetch(buildUrl("/product_prices"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    console.error("Product price creation error:", await res.text());
    return false;
  }
  return true;
}
