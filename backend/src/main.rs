// main.rs

mod auth;
mod models;
mod schema;

use std::env;
use std::sync::Arc;

use axum::{extract::State, http::StatusCode, routing::post, Extension, Json, Router};
use bcrypt::{hash, verify, DEFAULT_COST};
use diesel::pg::PgConnection;
use diesel::prelude::*;
use diesel::result::{DatabaseErrorKind, Error as DieselError};
use dotenvy::dotenv;
use serde::Serialize;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

use auth::{generate_jwt, require_auth};
use models::{
    Category, CategoryPayload, CreateTransactionResponse, LoginRequest, NewCategory, NewProduct,
    NewProductPrice, NewTransaction, NewUser, Product, ProductPayload, ProductPrice,
    ProductPriceDto, Transaction, TransactionPayload, User,
};

#[cfg(test)]
mod tests;

// ===============================
//   Shared Types & Utilities
// ===============================

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

fn error_response(msg: impl ToString) -> (StatusCode, Json<ErrorResponse>) {
    (
        StatusCode::BAD_REQUEST,
        Json(ErrorResponse {
            error: msg.to_string(),
        }),
    )
}

type JsonResult<T> = Result<Json<T>, (StatusCode, Json<ErrorResponse>)>;

#[derive(Clone)]
pub struct AppState {
    db_url: String,
}

fn get_connection(db_url: &str) -> PgConnection {
    PgConnection::establish(db_url).unwrap_or_else(|_| panic!("Error connecting to {db_url}"))
}

// ===============================
//        USER ENDPOINTS
// ===============================

#[derive(Serialize)]
struct PublicUser {
    id: i32,
    email: String,
}

#[axum::debug_handler]
async fn sign_up(
    State(state): State<Arc<AppState>>,
    Json(mut new_user): Json<NewUser>,
) -> JsonResult<PublicUser> {
    let mut conn = get_connection(&state.db_url);

    // Hash password
    let hashed =
        hash(&new_user.password_hash, DEFAULT_COST).map_err(|e| error_response(format!("{e}")))?;
    new_user.password_hash = hashed;

    // Insert user
    let inserted: User = diesel::insert_into(schema::users::table)
        .values(&new_user)
        .get_result(&mut conn)
        .map_err(|e| {
            if let DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _) = e {
                error_response("A user with that email already exists")
            } else {
                error_response(format!("Failed to insert user: {e}"))
            }
        })?;

    let public = PublicUser {
        id: inserted.id,
        email: inserted.email,
    };
    Ok(Json(public))
}

#[derive(Serialize)]
struct TokenResponse {
    token: String,
}

// POST /login
async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> JsonResult<TokenResponse> {
    use schema::users::dsl::*;
    let mut conn = get_connection(&state.db_url);

    let maybe_user = users
        .filter(email.eq(&payload.email))
        .first::<User>(&mut conn)
        .optional()
        .map_err(|e| error_response(format!("Error querying user: {e}")))?;

    let Some(u) = maybe_user else {
        return Err(error_response("Invalid email or password"));
    };

    let matches = verify(&payload.password_hash, &u.password_hash).unwrap_or(false);
    if !matches {
        return Err(error_response("Invalid email or password"));
    }

    let token_str = generate_jwt(u.id);
    Ok(Json(TokenResponse { token: token_str }))
}

// ===============================
//    CATEGORY ENDPOINTS
// ===============================

async fn create_category(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<CategoryPayload>,
) -> JsonResult<Category> {
    use schema::categories::dsl;
    let mut conn = get_connection(&state.db_url);

    let new_cat = NewCategory {
        user_id: logged_in_user_id,
        parent_category_id: payload.parent_category_id,
        name: payload.name,
    };

    if new_cat.name.trim().is_empty() {
        return Err(error_response("Category name cannot be empty"));
    }

    let inserted = diesel::insert_into(dsl::categories)
        .values(&new_cat)
        .get_result::<Category>(&mut conn)
        .map_err(|e| {
            if let DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _) = e {
                error_response("Category already exists")
            } else {
                error_response(format!("Failed to create category: {e}"))
            }
        })?;

    Ok(Json(inserted))
}

async fn list_categories(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> Json<Vec<Category>> {
    use schema::categories::dsl::*;
    let mut conn = get_connection(&state.db_url);

    let items = categories
        .filter(user_id.eq(logged_in_user_id))
        .load::<Category>(&mut conn)
        .expect("Error loading categories");

    Json(items)
}

// ===============================
//    PRODUCT ENDPOINTS
// ===============================

async fn create_product(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<ProductPayload>,
) -> JsonResult<Product> {
    use schema::products::dsl;
    let mut conn = get_connection(&state.db_url);

    let new_prod = NewProduct {
        user_id: logged_in_user_id,
        category_id: payload.category_id,
        name: payload.name,
    };

    let inserted = diesel::insert_into(dsl::products)
        .values(&new_prod)
        .get_result::<Product>(&mut conn)
        .map_err(|e| {
            if let DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _) = e {
                error_response("Product already exists")
            } else {
                error_response(format!("Failed to create product: {e}"))
            }
        })?;

    Ok(Json(inserted))
}

async fn list_products(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> Json<Vec<Product>> {
    use schema::products::dsl::*;
    let mut conn = get_connection(&state.db_url);

    let items = products
        .filter(user_id.eq(logged_in_user_id))
        .load::<Product>(&mut conn)
        .expect("Error loading products");

    Json(items)
}

// ===============================
//  PRODUCT PRICE ENDPOINTS
// ===============================

async fn create_product_price(
    State(state): State<Arc<AppState>>,
    Json(pp): Json<NewProductPrice>,
) -> JsonResult<ProductPrice> {
    use schema::product_prices::dsl;
    let mut conn = get_connection(&state.db_url);

    let inserted = diesel::insert_into(dsl::product_prices)
        .values(&pp)
        .get_result::<ProductPrice>(&mut conn)
        .map_err(|e| {
            if let DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _) = e {
                error_response("Duplicate product price entry")
            } else {
                error_response(format!("Failed to create product price: {e}"))
            }
        })?;

    Ok(Json(inserted))
}

async fn list_product_prices(State(state): State<Arc<AppState>>) -> Json<Vec<ProductPriceDto>> {
    use schema::product_prices::dsl::*;
    let mut conn = get_connection(&state.db_url);

    let items = product_prices
        .load::<ProductPrice>(&mut conn)
        .expect("Error loading product prices");

    // price is in cents, convert to float
    let items = items
        .into_iter()
        .map(|pp| ProductPriceDto {
            id: pp.id,
            product_id: pp.product_id,
            price: pp.price as f64 / 100.0,
            created_at: pp.created_at,
        })
        .collect();

    Json(items)
}

// ===============================
//  TRANSACTION ENDPOINTS
// ===============================

/// Create a transaction, referencing either `product_price_id`
/// or creating a new price if `price` is given (in cents).
async fn create_transaction(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<TransactionPayload>,
) -> JsonResult<CreateTransactionResponse> {
    use schema::product_prices::dsl as pp;
    use schema::products::dsl as pr;
    use schema::transactions::dsl as tx;

    let mut conn = get_connection(&state.db_url);

    let result = conn.transaction::<CreateTransactionResponse, DieselError, _>(|txn_conn| {
        // 1) figure out final_product_id
        let final_product_id = match payload.product_id {
            Some(existing_pid) => existing_pid,
            None => {
                let name = payload
                    .product_name
                    .as_ref()
                    .ok_or_else(|| DieselError::RollbackTransaction)?
                    .trim();
                if name.is_empty() {
                    return Err(DieselError::RollbackTransaction);
                }

                let new_prod = NewProduct {
                    user_id: logged_in_user_id,
                    category_id: None,
                    name: name.to_string(),
                };

                diesel::insert_into(pr::products)
                    .values(&new_prod)
                    .returning(pr::id)
                    .get_result::<i32>(txn_conn)?
            }
        };

        // 2) figure out final_price_id
        let final_price_id = if let Some(pp_id) = payload.product_price_id {
            // optionally verify belongs to product, but skipping here
            pp_id
        } else {
            // 'price' is in float dollars in the payload
            let cents = (payload.price.unwrap_or(0.0) * 100.0) as i32;

            let new_price = NewProductPrice {
                product_id: final_product_id,
                price: cents,
                created_at: payload.date,
            };

            diesel::insert_into(pp::product_prices)
                .values(&new_price)
                .returning(pp::id)
                .get_result::<i32>(txn_conn)?
        };

        // 3) insert transaction
        let new_tx = NewTransaction {
            user_id: logged_in_user_id,
            product_id: final_product_id,
            product_price_id: final_price_id,
            transaction_type: payload.transaction_type,
            description: payload.description.clone(),
            date: payload.date,
        };

        let inserted_tx = diesel::insert_into(tx::transactions)
            .values(&new_tx)
            .get_result::<Transaction>(txn_conn)?;

        // 4) fetch the product
        let fetched_product = pr::products
            .filter(pr::id.eq(final_product_id))
            .first::<Product>(txn_conn)?;

        // 5) fetch the raw product_price (in cents)
        let fetched_price = pp::product_prices
            .filter(pp::id.eq(final_price_id))
            .first::<ProductPrice>(txn_conn)?;

        // Convert to our float-based DTO
        let price_dto = ProductPriceDto {
            id: fetched_price.id,
            product_id: fetched_price.product_id,
            price: fetched_price.price as f64 / 100.0,
            created_at: fetched_price.created_at,
        };

        // Return the expanded response
        Ok(CreateTransactionResponse {
            transaction: inserted_tx,
            product: fetched_product,
            product_price: price_dto,
        })
    });

    match result {
        Ok(expanded_response) => Ok(Json(expanded_response)),
        Err(DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _)) => {
            Err(error_response("Duplicate transaction entry"))
        }
        Err(e) => Err(error_response(format!("Failed to create transaction: {e}"))),
    }
}

/// GET /transactions -> returns TransactionDto with optional price (as float).
pub async fn list_transactions(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> Json<Vec<Transaction>> {
    use schema::transactions::dsl::*;
    let mut conn = get_connection(&state.db_url);

    // Fetch transactions exactly as they appear in the DB
    let user_transactions = transactions
        .filter(user_id.eq(logged_in_user_id))
        .load::<Transaction>(&mut conn)
        .expect("Failed to load transactions");

    Json(user_transactions)
}

// ===============================
//      ROUTER + MAIN
// ===============================

pub fn main_router(shared_state: Arc<AppState>) -> Router {
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
        .layer(axum::middleware::from_fn(require_auth));

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/users", post(sign_up))
        .route("/login", post(login))
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
