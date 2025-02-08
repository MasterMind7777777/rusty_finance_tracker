use crate::schema::tags;
use diesel::prelude::*;
use diesel::{Insertable, Queryable};
use serde::{Deserialize, Serialize}; // Ensure your tags table is defined in schema.rs

/// The Tag record mapped to the `tags` table.
#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = tags)]
pub struct Tag {
    pub id: i32,
    pub name: String,
    pub user_id: i32,
}

/// Data Transfer Object for Tag.
#[derive(Serialize)]
pub struct TagDto {
    pub id: i32,
    pub name: String,
}

/// Structure for inserting a new tag.
#[derive(Insertable, Deserialize)]
#[diesel(table_name = tags)]
pub struct NewTag {
    pub name: String,
    pub user_id: i32,
}

/// Payload received from the client when creating a tag.
#[derive(Deserialize)]
pub struct TagPayload {
    pub name: String,
}

/// An enum to represent a tag reference (either an ID or a name).
#[derive(Clone, Deserialize)]
#[serde(untagged)]
pub enum TagReference {
    Id(i32),
    Name(String),
}
