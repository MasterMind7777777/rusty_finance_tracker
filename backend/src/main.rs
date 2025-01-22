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
    Category,
    CategoryPayload,
    LoginRequest,
    NewCategory,
    NewProduct,
    NewProductPrice,
    NewTransaction,
    NewUser,
    Product,
    ProductPayload,
    ProductPrice,
    Transaction,
    TransactionDto, // <-- Our DTO
    TransactionPayload,
    TransactionType,
    User,
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

async fn list_product_prices(State(state): State<Arc<AppState>>) -> Json<Vec<ProductPrice>> {
    use schema::product_prices::dsl::*;
    let mut conn = get_connection(&state.db_url);

    let items = product_prices
        .load::<ProductPrice>(&mut conn)
        .expect("Error loading product prices");

    Json(items)
}

// ===============================
//  TRANSACTION ENDPOINTS
// ===============================

/// Create a transaction, referencing either `product_price_id`
/// or creating a new price if an `amount` is given.
async fn create_transaction(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<TransactionPayload>,
) -> JsonResult<Transaction> {
    use schema::product_prices::dsl as pp;
    use schema::products::dsl as pr;
    use schema::transactions::dsl as tx;

    let mut conn = get_connection(&state.db_url);

    let result = conn.transaction::<Transaction, DieselError, _>(|txn_conn| {
        // 1) figure out product_id:
        let final_product_id = match payload.product_id {
            Some(existing_pid) => existing_pid,
            None => {
                // must create new product, or fail if no product_name
                let name = payload
                    .product_name
                    .as_ref()
                    .ok_or_else(|| DieselError::RollbackTransaction)?
                    .trim();
                if name.is_empty() {
                    return Err(DieselError::RollbackTransaction);
                }

                // Insert new product:
                let new_prod = NewProduct {
                    user_id: logged_in_user_id,
                    category_id: None, // or your logic
                    name: name.to_string(),
                };

                diesel::insert_into(pr::products)
                    .values(&new_prod)
                    .returning(pr::id)
                    .get_result::<i32>(txn_conn)?
            }
        };

        // 2) figure out product_price_id:
        //    Prioritize product_price_id if provided:
        let final_price_id = if let Some(pp_id) = payload.product_price_id {
            // Optionally verify that pp_id belongs to final_product_id, etc.
            pp_id
        } else {
            // Otherwise, create a new product_price if 'amount' is Some
            let cents = payload
                .amount
                .ok_or_else(|| DieselError::RollbackTransaction)?;
            if cents <= 0 {
                return Err(DieselError::RollbackTransaction);
            }

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

        // 3) insert transaction referencing product_price_id (not null)
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

        Ok(inserted_tx)
    });

    match result {
        Ok(tx) => Ok(Json(tx)),
        Err(DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _)) => {
            // Return a BAD_REQUEST with JSON error
            Err(error_response("Duplicate transaction entry"))
        }
        Err(e) => {
            // Return an INTERNAL_SERVER_ERROR with JSON error
            Err(error_response(format!("Failed to create transaction: {e}")))
        }
    }
}

// GET /transactions -> returns TransactionDto with optional amount
async fn list_transactions(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> Json<Vec<TransactionDto>> {
    use schema::product_prices::dsl as pp;
    use schema::products::dsl as pr;
    use schema::transactions::dsl as tx;

    let mut conn = get_connection(&state.db_url);

    // We'll do two left-joins:
    // 1) left_join(products) to get the product's category_id
    // 2) left_join(product_prices) matching (product_id, date)
    //
    // We'll select a tuple that includes:
    //  - transaction fields
    //  - product.category_id
    //  - product_prices.price (optional)
    //
    // Then map that into TransactionDto.
    type Row = (
        i32,                   // tx::id
        i32,                   // tx::user_id
        i32,                   // tx::product_id
        String,                // tx::transaction_type
        Option<String>,        // tx::description
        chrono::NaiveDateTime, // tx::date
        Option<i32>,           // products.category_id
        Option<i32>,           // product_prices.price
    );

    // Because we need to join products and product_prices, we do:
    //   transactions
    //     .left_join(products.on( products.id = transactions.product_id ))
    //     .left_join(product_prices.on( matching product_id & date ))

    let rows: Vec<Row> = tx::transactions
        .left_join(pr::products.on(pr::id.eq(tx::product_id)))
        .left_join(
            pp::product_prices.on(pp::product_id
                .eq(tx::product_id)
                .and(pp::created_at.eq(tx::date))),
        )
        .filter(tx::user_id.eq(logged_in_user_id))
        .select((
            tx::id,
            tx::user_id,
            tx::product_id,
            tx::transaction_type,
            tx::description,
            tx::date,
            pr::category_id.nullable(), // product's category_id
            pp::price.nullable(),       // matched product price
        ))
        .load::<Row>(&mut conn)
        .expect("Error loading transactions with product & optional price");

    // Convert rows -> TransactionDto
    let dtos = rows
        .into_iter()
        .map(
            |(id, user_id, product_id, raw_type, desc, dt, prod_cat_id, maybe_price)| {
                // Convert string -> TransactionType
                let tx_type = match raw_type.as_str() {
                    "income" => TransactionType::Income,
                    "expense" => TransactionType::Expense,
                    _ => {
                        eprintln!("Unexpected transaction_type: {}", raw_type);
                        TransactionType::Expense
                    }
                };
                TransactionDto {
                    id,
                    user_id,
                    product_id,
                    // Our schema says category is on the product, so let's store that in category_id:
                    category_id: prod_cat_id,
                    transaction_type: tx_type,
                    description: desc,
                    date: dt,
                    amount: maybe_price,
                }
            },
        )
        .collect();

    Json(dtos)
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
