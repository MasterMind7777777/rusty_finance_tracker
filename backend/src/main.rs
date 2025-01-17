mod auth;
mod models;
mod schema;

use std::env;
use std::sync::Arc;

use axum::{extract::State, routing::post, Extension, Json, Router};
use bcrypt::{hash, verify, DEFAULT_COST};
use diesel::prelude::*;
use diesel::result::{DatabaseErrorKind, Error as DieselError};
use diesel::sqlite::SqliteConnection;
use dotenvy::dotenv;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use auth::{generate_jwt, require_auth};
use models::{
    Category, CategoryPayload, LoginRequest, NewCategory, NewProduct, NewProductPrice,
    NewTransaction, NewUser, Product, ProductPayload, ProductPrice, Transaction,
    TransactionPayload, User,
};

#[cfg(test)]
mod tests;

// Global app state
#[derive(Clone)]
pub struct AppState {
    db_url: String,
}

// Helper to get a Diesel connection
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
#[axum::debug_handler]
async fn sign_up(
    State(state): State<Arc<AppState>>,
    Json(mut new_user): Json<NewUser>,
) -> &'static str {
    let mut conn = get_connection(&state.db_url);

    // Hash the raw password
    let hashed = hash(&new_user.password_hash, DEFAULT_COST).expect("Failed to hash password");
    new_user.password_hash = hashed;

    // Insert into DB
    let insert_result = diesel::insert_into(schema::users::table)
        .values(&new_user)
        .execute(&mut conn);

    handle_unique_violation(insert_result, "users", "User signed up")
}

// POST /login -> returns a JWT if correct credentials
async fn login(State(state): State<Arc<AppState>>, Json(payload): Json<LoginRequest>) -> String {
    let mut conn = get_connection(&state.db_url);

    use schema::users::dsl::*;
    let maybe_user = users
        .filter(email.eq(&payload.email))
        .select(User::as_select())
        .first::<User>(&mut conn)
        .optional()
        .expect("Error querying user");

    match maybe_user {
        Some(u) => {
            // Compare plaintext from login request to stored hash
            let password_matches =
                verify(&payload.password_hash, &u.password_hash).unwrap_or(false);

            if password_matches {
                // Generate a token
                let token = generate_jwt(u.id.expect("User ID should exist"));
                format!("{{\"token\": \"{}\"}}", token)
            } else {
                "Invalid email or password".to_string()
            }
        }
        None => "Invalid email or password".to_string(),
    }
}

//
// ============ CATEGORY ENDPOINTS ============
//

// POST /categories -> create a new category (requires valid token)
async fn create_category(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>, // Renamed from user_id
    Json(payload): Json<CategoryPayload>,
) -> String {
    let mut conn = get_connection(&state.db_url);

    // Build the Diesel struct that includes the DB field user_id
    let new_cat = NewCategory {
        user_id: logged_in_user_id, // reference the token’s user as user_id
        parent_category_id: payload.parent_category_id,
        name: payload.name,
    };

    let insert_result = diesel::insert_into(schema::categories::table)
        .values(&new_cat)
        .execute(&mut conn);

    handle_unique_violation(insert_result, "categories", "Category created").to_string()
}

// GET /categories -> list all categories (requires valid token)
async fn list_categories(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>, // Renamed from user_id
) -> Json<Vec<Category>> {
    let mut conn = get_connection(&state.db_url);

    use schema::categories::dsl::*;
    // Filter only the categories that match the logged-in user
    let results = categories
        .filter(user_id.eq(logged_in_user_id))
        .select(Category::as_select())
        .load(&mut conn)
        .expect("Error loading categories");

    Json(results)
}

//
// ============ PRODUCT ENDPOINTS ============
//

// POST /products
async fn create_product(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>, // Renamed
    Json(payload): Json<ProductPayload>,
) -> String {
    let mut conn = get_connection(&state.db_url);

    let new_prod = NewProduct {
        user_id: logged_in_user_id,
        name: payload.name,
    };

    let insert_result = diesel::insert_into(schema::products::table)
        .values(&new_prod)
        .execute(&mut conn);

    handle_unique_violation(insert_result, "products", "Product created").to_string()
}

// GET /products
async fn list_products(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>, // Renamed
) -> Json<Vec<Product>> {
    let mut conn = get_connection(&state.db_url);

    use schema::products::dsl::*;
    let results = products
        .filter(user_id.eq(logged_in_user_id))
        .select(Product::as_select())
        .load(&mut conn)
        .expect("Error loading products");

    Json(results)
}

//
// ============ PRODUCT PRICE ENDPOINTS ============
// (No user_id field in product_prices, so no changes needed.)

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
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<TransactionPayload>,
) -> Result<&'static str, &'static str> {
    let mut conn = get_connection(&state.db_url);

    // Validate mandatory product_id
    let product_id = match payload.product_id {
        Some(id) => id,
        None => return Err("Product ID is required"),
    };

    // Validate transaction_type
    match payload.transaction_type.as_str() {
        "in" | "out" => {}
        _ => return Err("Invalid transaction type. Must be 'in' or 'out'"),
    }

    // Optional: Handle amount if provided
    if let Some(tx_amount) = payload.amount {
        if tx_amount <= 0 {
            return Err("Amount must be a positive integer");
        }

        // Create a new product price entry if needed
        let new_product_price = NewProductPrice {
            product_id,
            price: tx_amount,
            created_at: payload.date.clone(),
        };

        let price_insert_result = diesel::insert_into(schema::product_prices::table)
            .values(&new_product_price)
            .execute(&mut conn);

        if price_insert_result.is_err() {
            return Err("Failed to create product price");
        }
    }

    // Prepare the new transaction
    let new_tx = NewTransaction {
        user_id: logged_in_user_id,
        product_id,
        category_id: payload.category_id,
        transaction_type: payload.transaction_type.clone(),
        description: payload.description.clone(),
        date: payload.date.clone(),
    };

    // Insert the new transaction
    let insert_result = diesel::insert_into(schema::transactions::table)
        .values(&new_tx)
        .execute(&mut conn);

    match insert_result {
        Ok(_) => Ok("Transaction created"),
        Err(DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _)) => {
            Err("Duplicate transaction entry")
        }
        Err(_) => Err("Failed to create transaction"),
    }
}

// GET /transactions -> list all transactions
async fn list_transactions(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>, // Renamed
) -> Json<Vec<Transaction>> {
    let mut conn = get_connection(&state.db_url);

    use schema::transactions::dsl::*;
    let results = transactions
        .filter(user_id.eq(logged_in_user_id))
        .select(Transaction::as_select())
        .load(&mut conn)
        .expect("Error loading transactions");

    Json(results)
}

//
// ============ ROUTER + MAIN ============
//
pub fn main_router(shared_state: Arc<AppState>) -> Router {
    // Protected endpoints require valid token (JWT).
    let protected_routes = Router::new()
        .route("/categories", post(create_category).get(list_categories))
        .route("/products", post(create_product).get(list_products))
        .route(
            "/product_prices",
            post(create_product_price).get(list_product_prices),
        )
        .route(
            "/transactions",
            post(create_transaction).get(list_transactions),
        )
        .layer(axum::middleware::from_fn(require_auth)); // <--- apply JWT check

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        // Public endpoints
        .route("/users", post(sign_up))
        .route("/login", post(login))
        // Protected
        .merge(protected_routes)
        .with_state(shared_state)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
}

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
