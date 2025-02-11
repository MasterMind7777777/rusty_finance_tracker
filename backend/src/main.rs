mod auth;
mod config;
mod db;
mod schema;

mod domain {
    pub mod analytics;
    pub mod categories;
    pub mod product_prices;
    pub mod products;
    pub mod tags;
    pub mod transactions;
    pub mod users;
}

mod routes {
    pub mod analytics_routes;
    pub mod category_routes;
    pub mod product_price_routes;
    pub mod product_routes;
    pub mod tag_routes;
    pub mod transaction_routes;
    pub mod user_routes;
}

// Standard + library crates
use axum::Router;
use backend::{error_response, JsonResult};
use routes::product_price_routes::product_price_routes;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

// Local modules
use crate::auth::require_auth;
use crate::config::AppConfig;
use crate::db::{init_pool, PgPool};

use crate::routes::{
    analytics_routes::analytics_routes, category_routes::category_routes,
    product_routes::product_routes, tag_routes::tag_routes, transaction_routes::transaction_routes,
    user_routes::user_routes,
};

#[cfg(test)]
mod tests;

/// Shared application state.
#[derive(Clone)]
pub struct AppState {
    /// Our r2d2 Postgres connection pool
    pub pool: PgPool,
}

// ==================================
//          ROUTER + MAIN
// ==================================

pub fn main_router(shared_state: Arc<AppState>) -> Router {
    let protected_routes = Router::new()
        // category routes
        .merge(category_routes())
        .merge(product_routes())
        .merge(product_price_routes())
        .merge(transaction_routes())
        .merge(tag_routes())
        .merge(analytics_routes())
        .layer(axum::middleware::from_fn(require_auth));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api_routes = Router::new().merge(user_routes()).merge(protected_routes);

    Router::new()
        .nest("/api", api_routes)
        .with_state(shared_state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}

/// The main entry point
#[tokio::main(flavor = "current_thread")]
async fn main() {
    // 1) Load .env + environment vars
    let config = AppConfig::from_env().expect("Failed to load AppConfig");

    // 2) Create the pool & store in AppState
    let pool = init_pool(&config.database_url);
    let shared_state = AppState { pool };

    // 3) Bind to the address from config
    let listener = TcpListener::bind(&config.address)
        .await
        .expect("Failed to bind to address");

    println!("Server running on http://{}", config.address);

    // 4) Build Axum router
    let app = main_router(Arc::new(shared_state));

    // 5) Serve
    axum::serve(listener, app).await.unwrap();
}
