use diesel::pg::Pg;
use diesel::prelude::*;
use diesel::serialize::{self, IsNull, Output, ToSql};
use diesel::sql_types::Text;
use diesel::{AsExpression, FromSqlRow, Insertable, Queryable};
use serde::{Deserialize, Serialize};
use std::io::Write;

use crate::schema::{categories, product_prices, products, transactions, users};
use chrono::NaiveDateTime;

// =====================
//      USER
// =====================

#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = users)]
pub struct User {
    pub id: i32,
    pub email: String,
    pub password_hash: String,
}

#[derive(Insertable, Deserialize)]
#[diesel(table_name = users)]
pub struct NewUser {
    pub email: String,
    pub password_hash: String,
}

// For login requests
#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password_hash: String,
}

// =====================
//     CATEGORY
// =====================

#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = categories)]
pub struct Category {
    pub id: i32,
    pub parent_category_id: Option<i32>,
    pub name: String,
    pub user_id: i32,
}

#[derive(Insertable)]
#[diesel(table_name = categories)]
pub struct NewCategory {
    pub user_id: i32,
    pub parent_category_id: Option<i32>,
    pub name: String,
}

// Payload for creation
#[derive(Deserialize)]
pub struct CategoryPayload {
    pub parent_category_id: Option<i32>,
    pub name: String,
}

// =====================
//     PRODUCT
// =====================

#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = products)]
pub struct Product {
    pub id: i32,
    pub user_id: i32,
    pub category_id: Option<i32>, // <-- ADDED: product references category
    pub name: String,
}

#[derive(Insertable)]
#[diesel(table_name = products)]
pub struct NewProduct {
    pub user_id: i32,
    pub category_id: Option<i32>, // <-- ADDED
    pub name: String,
}

// Payload for creation
#[derive(Deserialize)]
pub struct ProductPayload {
    pub category_id: Option<i32>, // <-- ADDED if you want to set category on creation
    pub name: String,
}

// =====================
//   PRODUCT PRICE
// =====================

#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = product_prices)]
pub struct ProductPrice {
    pub id: i32,
    pub product_id: i32,
    pub price: i32,
    pub created_at: NaiveDateTime,
}

#[derive(Serialize)]
pub struct ProductPriceDto {
    pub id: i32,
    pub product_id: i32,
    /// Price as a float with two decimals in JSON
    pub price: f64,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Insertable, Deserialize)]
#[diesel(table_name = product_prices)]
pub struct NewProductPrice {
    pub product_id: i32,
    pub price: i32,
    pub created_at: NaiveDateTime,
}

// =====================
//  TRANSACTION TYPE
// =====================

#[derive(Copy, Clone, Debug, PartialEq, Eq, AsExpression, FromSqlRow, Serialize, Deserialize)]
#[diesel(sql_type = Text)]
pub enum TransactionType {
    Expense,
    Income,
}

// How to store it in the DB (Postgres)
impl ToSql<Text, Pg> for TransactionType {
    fn to_sql(&self, out: &mut Output<'_, '_, Pg>) -> serialize::Result {
        match self {
            TransactionType::Expense => out.write_all(b"expense")?,
            TransactionType::Income => out.write_all(b"income")?,
        }
        Ok(IsNull::No)
    }
}

// How to read from the DB (Postgres)
impl diesel::deserialize::FromSql<Text, diesel::pg::Pg> for TransactionType {
    fn from_sql(
        bytes: <diesel::pg::Pg as diesel::backend::Backend>::RawValue<'_>,
    ) -> diesel::deserialize::Result<Self> {
        let s = <String as diesel::deserialize::FromSql<Text, Pg>>::from_sql(bytes)?;
        match s.as_str() {
            "expense" => Ok(TransactionType::Expense),
            "income" => Ok(TransactionType::Income),
            _ => Err(format!("Invalid transaction_type: {}", s).into()),
        }
    }
}

// =====================
//     TRANSACTION
// =====================

#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = transactions)]
pub struct Transaction {
    pub id: i32,
    pub user_id: i32,
    pub product_id: i32,
    pub product_price_id: i32,
    pub transaction_type: TransactionType,
    pub description: Option<String>,
    pub date: NaiveDateTime,
}

#[derive(Insertable)]
#[diesel(table_name = transactions)]
pub struct NewTransaction {
    pub user_id: i32,
    pub product_id: i32,
    pub product_price_id: i32,
    pub transaction_type: TransactionType,
    pub description: Option<String>,
    pub date: NaiveDateTime,
}

// What the client sends when creating a transaction
#[derive(Deserialize)]
pub struct TransactionPayload {
    pub product_id: Option<i32>, // optional if user can skip
    pub product_name: Option<String>,
    pub product_price_id: Option<i32>,
    pub price: Option<f64>, // optional if user wants to store price
    pub transaction_type: TransactionType,
    pub description: Option<String>,
    pub date: NaiveDateTime,
}

#[derive(Serialize)]
pub struct CreateTransactionResponse {
    pub transaction: Transaction,
    pub product: Product,
    pub product_price: ProductPriceDto,
}
/// DTO for listing transactions with an optional float price.
#[derive(Serialize)]
pub struct TransactionDto {
    pub id: i32,
    pub user_id: i32,
    pub product_id: i32,
    pub category_id: Option<i32>,
    pub transaction_type: TransactionType,
    pub description: Option<String>,
    pub date: chrono::NaiveDateTime,
    /// Price in floating dollars if available
    pub price: Option<f64>,
}
