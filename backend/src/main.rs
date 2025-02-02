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
    NewProductPrice, NewTag, NewTransaction, NewUser, Product, ProductPayload, ProductPrice,
    ProductPriceDto, Tag, TagDto, TagPayload, TagReference, Transaction, TransactionDto,
    TransactionPayload, User,
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
    use schema::tags::dsl as tags_dsl;
    use schema::transaction_tags::dsl as tt_dsl;
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

        // 6) Handle the tags (both ids and names)
        let final_tag_ids = if let Some(tag_refs) = &payload.tags {
            let mut ids = Vec::new();
            for tag_ref in tag_refs {
                match tag_ref {
                    TagReference::Id(id) => {
                        // Add ID directly if it's already known
                        ids.push(*id);
                    }
                    TagReference::Name(name) => {
                        // Look up or create the tag by name
                        let existing_tag: Option<Tag> = tags_dsl::tags
                            .filter(tags_dsl::name.eq(name))
                            .filter(tags_dsl::user_id.eq(logged_in_user_id))
                            .first::<Tag>(txn_conn)
                            .optional()?;

                        let tag_id = if let Some(tag) = existing_tag {
                            tag.id
                        } else {
                            let new_tag = NewTag {
                                name: name.clone(),
                                user_id: logged_in_user_id,
                            };
                            diesel::insert_into(tags_dsl::tags)
                                .values(&new_tag)
                                .returning(tags_dsl::id)
                                .get_result::<i32>(txn_conn)?
                        };
                        ids.push(tag_id);
                    }
                }
            }
            Some(ids)
        } else {
            None
        };

        // Insert the tags into the transaction_tags table
        if let Some(tag_ids) = final_tag_ids {
            for tag_id in tag_ids {
                diesel::insert_into(tt_dsl::transaction_tags)
                    .values((
                        tt_dsl::transaction_id.eq(inserted_tx.id),
                        tt_dsl::tag_id.eq(tag_id),
                    ))
                    .execute(txn_conn)?;
            }
        }

        // 7) Fetch the associated tags for the inserted transaction
        let associated_tags = tt_dsl::transaction_tags
            .inner_join(tags_dsl::tags.on(tt_dsl::tag_id.eq(tags_dsl::id)))
            .filter(tt_dsl::transaction_id.eq(inserted_tx.id))
            .select(tags_dsl::tags::all_columns())
            .load::<Tag>(txn_conn)?;

        // convert tags to DTO
        let response_tags = associated_tags
            .into_iter()
            .map(|tag| TagDto {
                id: tag.id,
                name: tag.name,
            })
            .collect();

        // Return the expanded response including tags
        Ok(CreateTransactionResponse {
            transaction: inserted_tx,
            product: fetched_product,
            product_price: price_dto,
            tags: response_tags,
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
) -> Json<Vec<TransactionDto>> {
    use schema::transactions::dsl::*;
    let mut conn = get_connection(&state.db_url);

    // Fetch transactions exactly as they appear in the DB
    let user_transactions = transactions
        .filter(user_id.eq(logged_in_user_id))
        .load::<Transaction>(&mut conn)
        .expect("Failed to load transactions");

    // Fetch associated tags for each transactions
    let tag_map = {
        use schema::tags::dsl::*;
        use schema::transaction_tags::dsl::*;

        let tag_ids = user_transactions
            .iter()
            .map(|tx| tx.id)
            .collect::<Vec<i32>>();

        transaction_tags
            .inner_join(tags)
            .filter(transaction_id.eq_any(tag_ids))
            .select((transaction_id, tags::all_columns()))
            .load::<(i32, Tag)>(&mut conn)
            .expect("Failed to load tags")
    };

    // convert transactions to DTO
    let user_transactions_dto = user_transactions
        .into_iter()
        .map(|tx| {
            let tags = tag_map
                .iter()
                .filter_map(
                    |(tx_id, tag)| {
                        if *tx_id == tx.id {
                            Some(tag.id)
                        } else {
                            None
                        }
                    },
                )
                .collect();

            TransactionDto {
                id: tx.id,
                user_id: tx.user_id,
                product_id: tx.product_id,
                product_price_id: tx.product_price_id,
                transaction_type: tx.transaction_type,
                description: tx.description.clone(),
                date: tx.date,
                tags,
            }
        })
        .collect();

    Json(user_transactions_dto)
}

// ===============================
//       TAG ENDPOINTS
// ===============================

// POST /tags
async fn create_tag(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<TagPayload>,
) -> JsonResult<Tag> {
    use schema::tags::dsl::*;
    let mut conn = get_connection(&state.db_url);

    // Construct a NewTag using the logged-in user's ID.
    let new_tag = NewTag {
        name: payload.name,
        user_id: logged_in_user_id,
    };

    let inserted = diesel::insert_into(tags)
        .values(&new_tag)
        .get_result::<Tag>(&mut conn)
        .map_err(|e| error_response(format!("Failed to create tag: {}", e)))?;

    Ok(Json(inserted))
}

// GET /tags
async fn list_tags(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> Json<Vec<Tag>> {
    use schema::tags::dsl::*;
    let mut conn = get_connection(&state.db_url);

    let items = tags
        .filter(user_id.eq(logged_in_user_id))
        .load::<Tag>(&mut conn)
        .expect("Error loading tags");

    Json(items)
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
        .route("/tags", post(create_tag).get(list_tags))
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
