use crate::domain::transactions::handlers::{create_transaction, list_transactions};
use crate::AppState;
use axum::{routing::post, Router};
use std::sync::Arc;

pub fn transaction_routes() -> Router<Arc<AppState>> {
    Router::new().route(
        "/transactions",
        post(create_transaction).get(list_transactions),
    )
}
