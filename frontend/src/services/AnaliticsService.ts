import {
  SpendingTimeSeriesEntry,
  CategorySpending,
  ProductPriceData,
} from "../types/analytics";
import { buildUrl, getAuthHeaders } from "./api";

/**
 * Fetch time series data of spending aggregated by date for the logged-in user.
 * Replaces your old generateSpendingTimeSeries() fake data.
 */
export async function fetchSpendingTimeSeries(
  token: string,
): Promise<SpendingTimeSeriesEntry[]> {
  const res = await fetch(buildUrl("/spending-time-series"), {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    console.error("Error fetching spending time series:", await res.text());
    return [];
  }
  return (await res.json()) as SpendingTimeSeriesEntry[];
}

/**
 * Fetch spending totals, grouped by category.
 * Replaces your old generateCategorySpending() fake data.
 */
export async function fetchCategorySpending(
  token: string,
): Promise<CategorySpending[]> {
  const res = await fetch(buildUrl("/category-spending"), {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    console.error("Error fetching category spending:", await res.text());
    return [];
  }
  return (await res.json()) as CategorySpending[];
}

/**
 * Fetch the historical price data for a specific product.
 * Replaces your old generateProductPriceData() fake data.
 */
export async function fetchProductPriceData(
  token: string,
  productId: number,
): Promise<ProductPriceData[]> {
  // Assume your server endpoint expects a `product_id` query param
  const url = buildUrl(`/product-price-data?product_id=${productId}`);
  const res = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    console.error("Error fetching product price data:", await res.text());
    return [];
  }
  return (await res.json()) as ProductPriceData[];
}
