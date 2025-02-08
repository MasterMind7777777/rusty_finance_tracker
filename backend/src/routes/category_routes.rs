use axum::{routing::post, Router};
use std::sync::Arc;

use crate::domain::categories::handlers::{create_category, list_categories};
use crate::AppState;

pub fn category_routes() -> Router<Arc<AppState>> {
    Router::new().route("/categories", post(create_category).get(list_categories))
}
