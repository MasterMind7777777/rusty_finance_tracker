use axum::{debug_handler, extract::State, Json};
use diesel::prelude::*;
use diesel::result::{DatabaseErrorKind, Error as DieselError};
use std::sync::Arc;

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
    Json(new_price): Json<NewProductPrice>,
) -> JsonResult<ProductPrice> {
    use crate::schema::product_prices::dsl;
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let inserted = diesel::insert_into(dsl::product_prices)
        .values(&new_price)
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
