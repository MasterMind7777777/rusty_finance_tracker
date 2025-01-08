// src/main.rs
mod models;
mod schema;

use axum::{extract::State, routing::post, Json, Router};
use diesel::prelude::*;
use diesel::result::{DatabaseErrorKind, Error as DieselError};
use diesel::sqlite::SqliteConnection;
use dotenvy::dotenv;
use std::env;
use std::sync::Arc;
use tokio::net::TcpListener;

use models::{
    Category, LoginRequest, NewCategory, NewProduct, NewProductPrice, NewTransaction, NewUser,
    Product, ProductPrice, Transaction, User,
};

#[cfg(test)]
mod tests;

#[derive(Clone)]
pub struct AppState {
    db_url: String,
}

// Simple helper to get a Diesel connection:
fn get_connection(db_url: &str) -> SqliteConnection {
    SqliteConnection::establish(db_url).unwrap_or_else(|_| panic!("Error connecting to {}", db_url))
}

// A generic helper to handle unique constraint violations or other errors.
fn handle_unique_violation(
    insert_result: Result<usize, DieselError>,
    entity_name: &str,
    success_message: &'static str,
) -> &'static str {
    match insert_result {
        Ok(_) => success_message,
        Err(DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _info)) => {
            // Return a string indicating which entity caused a duplicate
            match entity_name {
                "users" => "A user with that email already exists",
                "categories" => "Category already exists",
                "products" => "Product already exists",
                "product_prices" => "Duplicate product price entry",
                "transactions" => "Duplicate transaction entry",
                _ => "Unique constraint violation",
            }
        }
        Err(e) => {
            // Keep the old panic for other kinds of errors
            panic!("Error inserting {}: {}", entity_name, e);
        }
    }
}

//
// ============ USER ENDPOINTS ============
//

// POST /users -> sign up a new user
async fn sign_up(
    State(state): State<Arc<AppState>>,
    Json(new_user): Json<NewUser>,
) -> &'static str {
    let mut conn = get_connection(&state.db_url);

    let insert_result = diesel::insert_into(schema::users::table)
        .values(&new_user)
        .execute(&mut conn);

    handle_unique_violation(insert_result, "users", "User signed up")
}

// POST /login -> fake login check
async fn login(State(state): State<Arc<AppState>>, Json(payload): Json<LoginRequest>) -> String {
    let mut conn = get_connection(&state.db_url);

    // Check if user with this email + password exists
    use schema::users::dsl::*;
    let maybe_user = users
        .filter(email.eq(&payload.email))
        .filter(password_hash.eq(&payload.password_hash))
        .select(User::as_select())
        .first(&mut conn)
        .optional()
        .expect("Error querying user");

    match maybe_user {
        Some(u) => format!("Login successful for user_id={:?}", u.id),
        None => "Invalid email or password".to_string(),
    }
}

//
// ============ CATEGORY ENDPOINTS ============
//

// POST /categories -> create a new category (or subcategory)
async fn create_category(
    State(state): State<Arc<AppState>>,
    Json(new_cat): Json<NewCategory>,
) -> String {
    let mut conn = get_connection(&state.db_url);

    let insert_result = diesel::insert_into(schema::categories::table)
        .values(&new_cat)
        .execute(&mut conn);

    handle_unique_violation(insert_result, "categories", "Category created").to_string()
}

// GET /categories -> list all categories
async fn list_categories(State(state): State<Arc<AppState>>) -> Json<Vec<Category>> {
    let mut conn = get_connection(&state.db_url);

    use schema::categories::dsl::*;
    let results = categories
        .select(Category::as_select())
        .load(&mut conn)
        .expect("Error loading categories");

    Json(results)
}

//
// ============ PRODUCT ENDPOINTS ============
//

// POST /products -> create a product
async fn create_product(
    State(state): State<Arc<AppState>>,
    Json(new_prod): Json<NewProduct>,
) -> String {
    let mut conn = get_connection(&state.db_url);

    let insert_result = diesel::insert_into(schema::products::table)
        .values(&new_prod)
        .execute(&mut conn);

    handle_unique_violation(insert_result, "products", "Product created").to_string()
}

// GET /products -> list all products
async fn list_products(State(state): State<Arc<AppState>>) -> Json<Vec<Product>> {
    let mut conn = get_connection(&state.db_url);

    use schema::products::dsl::*;
    let results = products
        .select(Product::as_select())
        .load(&mut conn)
        .expect("Error loading products");

    Json(results)
}

//
// ============ PRODUCT PRICE ENDPOINTS ============
//

// POST /product_prices -> create a product price
async fn create_product_price(
    State(state): State<Arc<AppState>>,
    Json(pp): Json<NewProductPrice>,
) -> String {
    let mut conn = get_connection(&state.db_url);

    let insert_result = diesel::insert_into(schema::product_prices::table)
        .values(&pp)
        .execute(&mut conn);

    handle_unique_violation(insert_result, "product_prices", "Product price created").to_string()
}

// GET /product_prices -> list all product prices
async fn list_product_prices(State(state): State<Arc<AppState>>) -> Json<Vec<ProductPrice>> {
    let mut conn = get_connection(&state.db_url);

    use schema::product_prices::dsl::*;
    let results = product_prices
        .select(ProductPrice::as_select())
        .load(&mut conn)
        .expect("Error loading product prices");

    Json(results)
}

//
// ============ TRANSACTION ENDPOINTS ============
//

// POST /transactions -> create a transaction
async fn create_transaction(
    State(state): State<Arc<AppState>>,
    Json(tx_req): Json<NewTransaction>,
) -> &'static str {
    let mut conn = get_connection(&state.db_url);

    let insert_result = diesel::insert_into(schema::transactions::table)
        .values(&tx_req)
        .execute(&mut conn);

    handle_unique_violation(insert_result, "transactions", "Transaction created")
}

// GET /transactions -> list all transactions
async fn list_transactions(State(state): State<Arc<AppState>>) -> Json<Vec<Transaction>> {
    let mut conn = get_connection(&state.db_url);

    use schema::transactions::dsl::*;
    let results = transactions
        .select(Transaction::as_select())
        .load(&mut conn)
        .expect("Error loading transactions");

    Json(results)
}

pub fn main_router(shared_state: Arc<AppState>) -> Router {
    Router::new()
        // User endpoints
        .route("/users", post(sign_up))
        .route("/login", post(login))
        // Category endpoints
        .route("/categories", post(create_category).get(list_categories))
        // Product endpoints
        .route("/products", post(create_product).get(list_products))
        // ProductPrice endpoints
        .route(
            "/product_prices",
            post(create_product_price).get(list_product_prices),
        )
        // Transaction endpoints
        .route(
            "/transactions",
            post(create_transaction).get(list_transactions),
        )
        .with_state(shared_state)
}

//
// ============ MAIN ============
//
#[tokio::main(flavor = "current_thread")]
async fn main() {
    dotenv().ok();
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let shared_state = AppState { db_url };

    let listener = TcpListener::bind("127.0.0.1:3000")
        .await
        .expect("Failed to bind to address");

    println!("Server running on http://127.0.0.1:3000");

    let app = main_router(Arc::new(shared_state));

    axum::serve(listener, app).await.unwrap();
}
