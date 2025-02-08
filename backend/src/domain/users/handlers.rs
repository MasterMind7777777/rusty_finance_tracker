use axum::{debug_handler, extract::State, Json};
use bcrypt::{hash, verify, DEFAULT_COST};
use diesel::prelude::*;
use diesel::result::{DatabaseErrorKind, Error as DieselError};
use serde::Serialize;
use std::sync::Arc;

use crate::{
    auth::generate_jwt,
    error_response, // Some function in your main or a shared module
    schema,
    AppState,
    JsonResult,
};

use super::models::{LoginRequest, NewUser, User};

/// A minimal struct to return after sign-up
#[derive(Serialize)]
pub struct PublicUser {
    pub id: i32,
    pub email: String,
}

/// A minimal struct to return after login
#[derive(Serialize)]
pub struct TokenResponse {
    pub token: String,
}

/// POST /users
#[debug_handler] // <--- Fixes the "Handler not implemented" error in separate file
pub async fn sign_up(
    State(state): State<Arc<AppState>>,
    Json(mut new_user): Json<NewUser>,
) -> JsonResult<PublicUser> {
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

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

    Ok(Json(PublicUser {
        id: inserted.id,
        email: inserted.email,
    }))
}

/// POST /login
#[debug_handler]
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> JsonResult<TokenResponse> {
    use schema::users::dsl::*;
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

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
