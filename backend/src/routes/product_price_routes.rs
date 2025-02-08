use crate::domain::product_prices::handlers::{create_product_price, list_product_prices};
use crate::AppState;
use axum::{routing::post, Router};
use std::sync::Arc;

/// Returns a sub-router for product price endpoints.
pub fn product_price_routes() -> Router<Arc<AppState>> {
    Router::new().route(
        "/product_prices",
        post(create_product_price).get(list_product_prices),
    )
}
