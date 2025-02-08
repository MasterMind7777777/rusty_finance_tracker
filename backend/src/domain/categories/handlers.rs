use axum::{debug_handler, extract::State, Extension, Json};
use diesel::prelude::*;
use diesel::result::{DatabaseErrorKind, Error as DieselError};
use std::sync::Arc;

use super::models::{Category, CategoryPayload, NewCategory};
use crate::{error_response, schema, AppState, JsonResult};

/// POST /categories
#[debug_handler]
pub async fn create_category(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<CategoryPayload>,
) -> JsonResult<Category> {
    use schema::categories::dsl;

    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

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

/// GET /categories
#[debug_handler]
pub async fn list_categories(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> JsonResult<Vec<Category>> {
    use schema::categories::dsl::*;
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let items = categories
        .filter(user_id.eq(logged_in_user_id))
        .load::<Category>(&mut conn)
        .map_err(|e| error_response(format!("Error loading categories: {e}")))?;

    Ok(Json(items))
}
