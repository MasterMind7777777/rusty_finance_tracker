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

/// Updated payload for creation: allows the parent to be specified either by ID or by name.
#[derive(Deserialize)]
pub struct CategoryPayload {
    pub parent_category_id: Option<i32>,
    pub parent_category_name: Option<String>,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CategoryDto {
    pub id: i32,
    pub name: String,
}

/// The response after creating a category.
#[derive(Serialize, Deserialize, Debug)]
pub struct CreateCategoryResponse {
    pub category: Category,
    pub parent: Option<CategoryDto>,
}
