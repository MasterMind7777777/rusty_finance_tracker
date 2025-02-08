use crate::domain::categories::models::CategoryDto;
use axum::{debug_handler, extract::State, Extension, Json};
use diesel::prelude::*;
use diesel::result::{DatabaseErrorKind, Error as DieselError};
use std::sync::Arc;

use super::models::{Category, CategoryPayload, NewCategory};
use crate::domain::categories::models::CreateCategoryResponse;
use crate::{error_response, schema, AppState, JsonResult};

/// POST /categories
#[debug_handler]
pub async fn create_category(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<CategoryPayload>,
) -> JsonResult<CreateCategoryResponse> {
    use schema::categories::dsl;
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let result = conn.transaction::<CreateCategoryResponse, DieselError, _>(|txn_conn| {
        // Determine the parent's id.
        let parent_id: Option<i32> = if let Some(id) = payload.parent_category_id {
            Some(id)
        } else if let Some(ref parent_name) = payload.parent_category_name {
            let trimmed = parent_name.trim();
            if trimmed.is_empty() {
                None
            } else {
                use schema::categories::dsl as cat_dsl;
                // Look for an existing parent category for the user.
                let existing_parent: Option<Category> = cat_dsl::categories
                    .filter(cat_dsl::name.eq(trimmed))
                    .filter(cat_dsl::user_id.eq(logged_in_user_id))
                    .first::<Category>(txn_conn)
                    .optional()?;
                if let Some(parent) = existing_parent {
                    Some(parent.id)
                } else {
                    // No existing parent found; create a new one.
                    let new_parent = NewCategory {
                        user_id: logged_in_user_id,
                        parent_category_id: None,
                        name: trimmed.to_string(),
                    };
                    let new_parent_id = diesel::insert_into(cat_dsl::categories)
                        .values(&new_parent)
                        .returning(cat_dsl::id)
                        .get_result::<i32>(txn_conn)?;
                    Some(new_parent_id)
                }
            }
        } else {
            None
        };

        // Validate new category name.
        if payload.name.trim().is_empty() {
            return Err(DieselError::RollbackTransaction);
        }

        // Create the new (child) category with the determined parent_id.
        let new_cat = NewCategory {
            user_id: logged_in_user_id,
            parent_category_id: parent_id,
            name: payload.name.clone(),
        };

        let inserted = diesel::insert_into(dsl::categories)
            .values(&new_cat)
            .get_result::<Category>(txn_conn)?;

        // If a parent exists, fetch its details and map to a DTO.
        let parent_dto = if let Some(pid) = inserted.parent_category_id {
            use schema::categories::dsl as cat_dsl;
            let parent = cat_dsl::categories
                .filter(cat_dsl::id.eq(pid))
                .first::<Category>(txn_conn)
                .optional()?;
            parent.map(|p| CategoryDto {
                id: p.id,
                name: p.name,
            })
        } else {
            None
        };

        Ok(CreateCategoryResponse {
            category: inserted,
            parent: parent_dto,
        })
    });

    match result {
        Ok(response) => Ok(Json(response)),
        Err(DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _)) => {
            Err(error_response("Category already exists"))
        }
        Err(e) => Err(error_response(format!("Failed to create category: {e}"))),
    }
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
