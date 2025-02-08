use axum::{routing::get, Router};
use std::sync::Arc;

use crate::domain::analytics::handlers::{
    category_spending, product_price_data, spending_time_series,
};
use crate::AppState;

/// Provides routes for analytics endpoints.
pub fn analytics_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/spending-time-series", get(spending_time_series))
        .route("/category-spending", get(category_spending))
        .route("/product-price-data", get(product_price_data))
}
