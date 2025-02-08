use axum::{routing::post, Router};
use std::sync::Arc;

use crate::domain::products::handlers::{create_product, list_products};
use crate::AppState;

pub fn product_routes() -> Router<Arc<AppState>> {
    Router::new().route("/products", post(create_product).get(list_products))
}
