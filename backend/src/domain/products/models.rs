use crate::{domain::categories::models::CategoryDto, schema::products};
use serde::{Deserialize, Serialize};

/// The main product record, referencing `products` table
#[derive(diesel::Selectable, diesel::Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = products)]
pub struct Product {
    pub id: i32,
    pub user_id: i32,
    pub category_id: Option<i32>,
    pub name: String,
}

#[derive(diesel::Insertable)]
#[diesel(table_name = products)]
pub struct NewProduct {
    pub user_id: i32,
    pub category_id: Option<i32>,
    pub name: String,
}

#[derive(Deserialize)]
pub struct ProductPayload {
    /// If provided, this is used as the category id.
    pub category_id: Option<i32>,
    /// Alternatively, if no category id is given, a non-empty category name may be provided.
    pub category_name: Option<String>,
    pub name: String,
}

#[derive(Serialize)]
pub struct CreateProductResponse {
    pub product: Product,
    pub category: Option<CategoryDto>,
}

/// A Data Transfer Object for exposing products without the user_id.
#[derive(Serialize, Debug)]
pub struct ProductDto {
    pub id: i32,
    pub category_id: Option<i32>,
    pub name: String,
}

impl From<Product> for ProductDto {
    fn from(product: Product) -> Self {
        Self {
            id: product.id,
            category_id: product.category_id,
            name: product.name,
        }
    }
}
