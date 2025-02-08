use axum::{routing::post, Router};
use std::sync::Arc;

use crate::domain::users::handlers::{login, sign_up};
use crate::AppState;

/// Provides routes for user sign-up and login
pub fn user_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/users", post(sign_up))
        .route("/login", post(login))
}
