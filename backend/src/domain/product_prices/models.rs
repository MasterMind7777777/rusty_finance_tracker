use crate::{domain::products::models::Product, schema::product_prices};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

/// The main record for a product price.
#[derive(diesel::Selectable, diesel::Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = product_prices)]
pub struct ProductPrice {
    pub id: i32,
    pub product_id: i32,
    pub price: i32, // Stored in cents.
    pub created_at: NaiveDateTime,
}

/// DTO for returning a product price with a float value.
#[derive(Serialize)]
pub struct ProductPriceDto {
    pub id: i32,
    pub product_id: i32,
    /// Price as a float (dollars).
    pub price: f64,
    pub created_at: NaiveDateTime,
}

/// For inserting a new product price.
#[derive(Insertable, Deserialize)]
#[diesel(table_name = product_prices)]
pub struct NewProductPrice {
    pub product_id: i32,
    pub price: i32, // In cents.
    pub created_at: NaiveDateTime,
}

#[derive(Deserialize)]
pub struct ProductPricePayload {
    pub product_id: Option<i32>,
    pub product_name: Option<String>,
    pub price: f64, // in dollars
    pub created_at: NaiveDateTime,
}

#[derive(Serialize)]
pub struct CreateProductPriceResponse {
    pub product_price: ProductPriceDto,
    pub product: Product,
}
