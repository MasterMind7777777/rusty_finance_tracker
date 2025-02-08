use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct SpendingTimeSeriesEntry {
    /// Date in "YYYY-MM-DD" format
    pub date: String,
    pub total_spending: f64,
}

#[derive(Debug, Serialize)]
pub struct CategorySpending {
    pub category_name: String,
    pub total_spending: f64,
}

#[derive(Debug, Serialize)]
pub struct ProductPriceData {
    /// Date in "YYYY-MM-DD" format
    pub date: String,
    pub price: f64,
}
