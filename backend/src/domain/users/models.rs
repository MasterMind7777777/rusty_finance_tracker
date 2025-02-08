use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::schema::users;

/// The main user record, mapped to the `users` table.
#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = users)]
pub struct User {
    pub id: i32,
    pub email: String,
    pub password_hash: String,
}

/// Used when inserting a new user into `users`.
#[derive(Insertable, Deserialize)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub email: String,
    pub password_hash: String,
}

/// Used by clients to send login data (email + password).
#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password_hash: String,
}
