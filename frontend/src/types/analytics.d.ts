/** The shape returned by your `/spending_time_series` endpoint. */
export interface SpendingTimeSeriesEntry {
  date: string;
  totalSpending: number;
}

/** The shape returned by your `/category_spending` endpoint. */
export interface CategorySpending {
  categoryName: string;
  totalSpending: number;
}

/** The shape returned by your `/product_price_data` endpoint. */
export interface ProductPriceData {
  date: string;
  price: number;
}
