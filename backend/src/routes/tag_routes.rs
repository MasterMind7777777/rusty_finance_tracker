use crate::domain::tags::handlers::{create_tag, list_tags};
use crate::AppState;
use axum::{routing::post, Router};
use std::sync::Arc;

/// Returns a sub-router for tag endpoints.
pub fn tag_routes() -> Router<Arc<AppState>> {
    Router::new().route("/tags", post(create_tag).get(list_tags))
}
