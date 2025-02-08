use crate::domain::categories::models::Category;
use crate::domain::categories::models::CategoryDto;
use crate::domain::categories::models::NewCategory;
use crate::domain::products::models::CreateProductResponse;
use crate::domain::products::models::NewProduct;
use crate::domain::products::models::ProductDto;
use crate::schema::products::dsl;
use axum::{debug_handler, extract::State, Extension, Json};
use diesel::prelude::*;
use diesel::result::DatabaseErrorKind;
use diesel::result::Error as DieselError;
use std::sync::Arc;

use super::models::{Product, ProductPayload};
use crate::{error_response, schema, AppState, JsonResult};

#[debug_handler]
pub async fn create_product(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<ProductPayload>,
) -> JsonResult<CreateProductResponse> {
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let result = conn.transaction::<CreateProductResponse, DieselError, _>(|txn_conn| {
        // 1) Determine the final category id.
        let final_category_id = if let Some(cat_id) = payload.category_id {
            Some(cat_id)
        } else if let Some(ref cat_name) = payload.category_name {
            let trimmed = cat_name.trim();
            if trimmed.is_empty() {
                None
            } else {
                use crate::schema::categories::dsl as cat_dsl;
                let existing_category: Option<Category> = cat_dsl::categories
                    .filter(cat_dsl::name.eq(trimmed))
                    .filter(cat_dsl::user_id.eq(logged_in_user_id))
                    .first::<Category>(txn_conn)
                    .optional()?;
                let cat_id = if let Some(category) = existing_category {
                    category.id
                } else {
                    let new_category = NewCategory {
                        name: trimmed.to_string(),
                        parent_category_id: None,
                        user_id: logged_in_user_id,
                    };
                    diesel::insert_into(cat_dsl::categories)
                        .values(&new_category)
                        .returning(cat_dsl::id)
                        .get_result::<i32>(txn_conn)?
                };
                Some(cat_id)
            }
        } else {
            None
        };

        // 2) Build the new product record with the final category id.
        let new_prod = NewProduct {
            user_id: logged_in_user_id,
            category_id: final_category_id,
            name: payload.name.clone(),
        };

        // 3) Insert the new product.
        let inserted = diesel::insert_into(dsl::products)
            .values(&new_prod)
            .get_result::<Product>(txn_conn)?;

        // 4) If a category id exists on the inserted product, fetch its details as a DTO.
        let category_dto = if let Some(cat_id) = inserted.category_id {
            use crate::schema::categories::dsl as cat_dsl;
            let cat = cat_dsl::categories
                .filter(cat_dsl::id.eq(cat_id))
                .first::<Category>(txn_conn)
                .optional()?;
            cat.map(|c| CategoryDto {
                id: c.id,
                name: c.name,
            })
        } else {
            None
        };

        Ok(CreateProductResponse {
            product: inserted,
            category: category_dto,
        })
    });

    match result {
        Ok(resp) => Ok(axum::Json(resp)),
        Err(DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _)) => {
            Err(error_response("Product already exists"))
        }
        Err(e) => Err(error_response(format!("Failed to create product: {e}"))),
    }
}

/// GET /products
#[debug_handler]
pub async fn list_products(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> JsonResult<Vec<ProductDto>> {
    use schema::products::dsl::*;
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let items = products
        .filter(user_id.eq(logged_in_user_id))
        .load::<Product>(&mut conn)
        .map_err(|e| error_response(format!("Error loading products: {e}")))?;

    // Convert each Product into a ProductDto (which omits the user_id).
    let product_dtos: Vec<ProductDto> = items.into_iter().map(ProductDto::from).collect();

    Ok(Json(product_dtos))
}
