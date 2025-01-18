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

  // The server returns product prices in cents, e.g. 1234 => $12.34
  const rawPrices = (await res.json()) as ProductPrice[];

  // Convert from integer cents to floating-dollar
  const prices = rawPrices.map((p) => ({
    ...p,
    price: p.price / 100,
  }));
  return prices;
}

export async function createProductPrice(
  token: string,
  payload: NewProductPrice,
): Promise<ProductPrice | null> {
  // Convert from dollar float to integer cents
  const payloadCents: NewProductPrice = {
    ...payload,
    price: Math.round(payload.price * 100),
  };

  const res = await fetch(buildUrl("/product_prices"), {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payloadCents),
  });

  if (!res.ok) {
    console.error("Product price creation error:", await res.text());
    return null;
  }

  // The server responds with the newly created ProductPrice in cents
  const created = (await res.json()) as ProductPrice;
  // Convert it back to a floating-dollar
  created.price = created.price / 100;

  return created;
}
