use axum::extract::Request;
use axum::http::StatusCode;
use axum::middleware::Next;
use axum::response::Response;
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, DecodingKey, Validation};
use jsonwebtoken::{encode, EncodingKey, Header};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: i32,   // subject (user_id)
    exp: usize, // expiration
}

pub fn generate_jwt(user_id: i32) -> String {
    // Typically you'd load this from env or config
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "CHANGE_ME".to_string());

    // Set expiration (e.g. 24 hours)
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id,
        exp: expiration,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_ref()),
    )
    .expect("JWT encode should not fail")
}

pub async fn require_auth(req: Request, next: Next) -> Result<Response, StatusCode> {
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "CHANGE_ME".to_string());

    // Extract Authorization header
    let auth_header = match req.headers().get(axum::http::header::AUTHORIZATION) {
        Some(hv) => hv.to_str().map_err(|_| StatusCode::UNAUTHORIZED)?,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // Must start with "Bearer"
    if !auth_header.starts_with("Bearer ") {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // Extract the token portion
    let token = &auth_header["Bearer ".len()..];

    // Decode & validate the token
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_ref()),
        &Validation::default(),
    )
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    // Optionally, store `token_data.claims.sub` (user_id) in request extensions
    // so future handlers can figure out who is calling
    let user_id = token_data.claims.sub;
    print!("user id: {}", user_id);
    // e.g., req.extensions_mut().insert(user_id);

    Ok(next.run(req).await)
}
