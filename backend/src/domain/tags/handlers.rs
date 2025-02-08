use crate::schema::tags::dsl;
use crate::{error_response, AppState, JsonResult};
use axum::{
    debug_handler,
    extract::{Extension, State},
    Json,
};
use diesel::prelude::*;
use std::sync::Arc;

use super::models::{NewTag, Tag, TagPayload};

/// Handler for POST /tags.
/// Creates a new tag.
#[debug_handler]
pub async fn create_tag(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<TagPayload>,
) -> JsonResult<Tag> {
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let new_tag = NewTag {
        name: payload.name,
        user_id: logged_in_user_id,
    };

    let inserted = diesel::insert_into(dsl::tags)
        .values(&new_tag)
        .get_result::<Tag>(&mut conn)
        .map_err(|e| error_response(format!("Failed to create tag: {e}")))?;

    Ok(Json(inserted))
}

/// Handler for GET /tags.
/// Lists all tags for the given user.
#[debug_handler]
pub async fn list_tags(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> JsonResult<Vec<Tag>> {
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let items = dsl::tags
        .filter(dsl::user_id.eq(logged_in_user_id))
        .load::<Tag>(&mut conn)
        .map_err(|e| error_response(format!("Error loading tags: {e}")))?;

    Ok(Json(items))
}
