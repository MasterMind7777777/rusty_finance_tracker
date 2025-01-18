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
    // Because `users.id` is NOT NULL in the DB schema,
    // we store it as `i32`, not `Option<i32>`.
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
    // `products.id` is NOT NULL -> use `i32`
    pub id: i32,
    pub user_id: i32,
    pub name: String,
}

#[derive(Insertable)]
#[diesel(table_name = products)]
pub struct NewProduct {
    pub user_id: i32,
    pub name: String,
}

// Payload for creation
#[derive(Deserialize)]
pub struct ProductPayload {
    pub name: String,
}

// =====================
//   PRODUCT PRICE
// =====================

#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = product_prices)]
pub struct ProductPrice {
    // `product_prices.id` is NOT NULL -> use `i32`
    pub id: i32,
    pub product_id: i32,
    pub price: i32,
    pub created_at: NaiveDateTime,
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
    // `transactions.id` is NOT NULL -> use `i32`
    pub id: i32,
    pub user_id: i32,
    pub product_id: i32,
    pub category_id: Option<i32>,
    pub transaction_type: TransactionType,
    pub description: Option<String>,
    pub date: NaiveDateTime,
}

#[derive(Insertable)]
#[diesel(table_name = transactions)]
pub struct NewTransaction {
    pub user_id: i32,
    pub product_id: i32,
    pub category_id: Option<i32>,
    pub transaction_type: TransactionType,
    pub description: Option<String>,
    pub date: NaiveDateTime,
}

// What the client sends when creating a transaction
#[derive(Deserialize)]
pub struct TransactionPayload {
    // Optional because user might not know the product yet
    pub product_id: Option<i32>,
    pub category_id: Option<i32>,
    pub transaction_type: TransactionType,
    pub amount: Option<i32>,
    pub description: Option<String>,
    pub date: NaiveDateTime,
}
