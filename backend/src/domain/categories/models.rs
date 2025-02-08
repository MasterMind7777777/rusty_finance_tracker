use crate::schema::categories;
use serde::{Deserialize, Serialize};

#[derive(diesel::Selectable, diesel::Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = categories)]
pub struct Category {
    pub id: i32,
    pub parent_category_id: Option<i32>,
    pub name: String,
    pub user_id: i32,
}

#[derive(diesel::Insertable)]
#[diesel(table_name = categories)]
pub struct NewCategory {
    pub user_id: i32,
    pub parent_category_id: Option<i32>,
    pub name: String,
}

/// Payload for creation
#[derive(Deserialize)]
pub struct CategoryPayload {
    pub parent_category_id: Option<i32>,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CategoryDto {
    pub id: i32,
    pub name: String,
}
