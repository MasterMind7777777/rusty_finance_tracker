use axum::Extension;
use axum::{debug_handler, extract::State, Json};
use diesel::prelude::*;
use diesel::result::{DatabaseErrorKind, Error as DieselError};
use std::sync::Arc;

use crate::domain::product_prices::models::{CreateProductPriceResponse, ProductPricePayload};
use crate::domain::products::models::{NewProduct, Product};
use crate::{
    error_response, // Ensure this helper is defined in your crate root or shared module.
    AppState,
    JsonResult, // Ensure this type alias is available globally.
};

use super::models::{NewProductPrice, ProductPrice, ProductPriceDto};

/// Handler for POST /product_prices.
/// Inserts a new product price record.
#[debug_handler]
pub async fn create_product_price(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<ProductPricePayload>,
) -> JsonResult<CreateProductPriceResponse> {
    use crate::schema::product_prices::dsl;
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let result = conn.transaction::<CreateProductPriceResponse, DieselError, _>(|txn_conn| {
        // Resolve the product: if product_id is provided, use it; otherwise, if a product_name is provided, find or create the product.
        let final_product_id = if let Some(pid) = payload.product_id {
            pid
        } else if let Some(ref pname) = payload.product_name {
            let trimmed = pname.trim();
            if trimmed.is_empty() {
                return Err(DieselError::RollbackTransaction);
            }
            use crate::schema::products::dsl as prod_dsl;
            let existing_product: Option<Product> = prod_dsl::products
                .filter(prod_dsl::name.eq(trimmed))
                .filter(prod_dsl::user_id.eq(logged_in_user_id))
                .first::<Product>(txn_conn)
                .optional()?;
            if let Some(prod) = existing_product {
                prod.id
            } else {
                let new_prod = NewProduct {
                    user_id: logged_in_user_id,
                    category_id: None, // or add similar logic for category if needed
                    name: trimmed.to_string(),
                };
                diesel::insert_into(prod_dsl::products)
                    .values(&new_prod)
                    .returning(prod_dsl::id)
                    .get_result::<i32>(txn_conn)?
            }
        } else {
            return Err(DieselError::RollbackTransaction);
        };

        // Convert price to cents.
        let price_cents = (payload.price * 100.0).round() as i32;
        let new_price = NewProductPrice {
            product_id: final_product_id,
            price: price_cents,
            created_at: payload.created_at,
        };

        let inserted = diesel::insert_into(dsl::product_prices)
            .values(&new_price)
            .get_result::<ProductPrice>(txn_conn)?;

        // conver to DTO
        let inserted_dto = ProductPriceDto {
            id: inserted.id,
            product_id: inserted.product_id,
            price: inserted.price as f64 / 100.0,
            created_at: inserted.created_at,
        };

        // Fetch the resolved product record.
        use crate::schema::products::dsl as prod_dsl;
        let prod = prod_dsl::products
            .filter(prod_dsl::id.eq(final_product_id))
            .first::<Product>(txn_conn)?;

        Ok(CreateProductPriceResponse {
            product_price: inserted_dto,
            product: prod,
        })
    });

    match result {
        Ok(response) => Ok(Json(response)),
        Err(DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _)) => {
            Err(error_response("Duplicate product price entry"))
        }
        Err(e) => Err(error_response(format!(
            "Failed to create product price: {e}"
        ))),
    }
}

/// Handler for GET /product_prices.
/// Retrieves all product price records and converts them to DTOs.
#[debug_handler]
pub async fn list_product_prices(
    State(state): State<Arc<AppState>>,
) -> JsonResult<Vec<ProductPriceDto>> {
    use crate::schema::product_prices::dsl::*;
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let items = product_prices
        .load::<ProductPrice>(&mut conn)
        .map_err(|e| error_response(format!("Error loading product prices: {e}")))?;

    let dtos = items
        .into_iter()
        .map(|pp| ProductPriceDto {
            id: pp.id,
            product_id: pp.product_id,
            price: pp.price as f64 / 100.0,
            created_at: pp.created_at,
        })
        .collect();

    Ok(Json(dtos))
}
