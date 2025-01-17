use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use diesel::sql_types::Text;
use diesel::sqlite::Sqlite;
use diesel::{AsExpression, FromSqlRow, Queryable};

use crate::schema::{categories, product_prices, products, transactions, users};

// =====================
//      USER
// =====================
#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = users)]
pub struct User {
    pub id: Option<i32>,
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

// What gets stored in DB (needs user_id)
#[derive(Insertable)]
#[diesel(table_name = categories)]
pub struct NewCategory {
    pub user_id: i32,
    pub parent_category_id: Option<i32>,
    pub name: String,
}

// What the client sends (no user_id)
#[derive(Deserialize)]
pub struct CategoryPayload {
    pub parent_category_id: Option<i32>,
    pub name: String,
}

#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
#[diesel(table_name = categories)]
pub struct Category {
    pub id: Option<i32>,
    pub user_id: i32,
    pub parent_category_id: Option<i32>,
    pub name: String,
}

// =====================
//     PRODUCT
// =====================

// DB struct
#[derive(Insertable)]
#[diesel(table_name = products)]
pub struct NewProduct {
    pub user_id: i32,
    pub name: String,
}

// Client-sent payload
#[derive(Deserialize)]
pub struct ProductPayload {
    pub name: String,
}

#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
pub struct Product {
    pub id: Option<i32>,
    pub user_id: i32,
    pub name: String,
}

// =====================
//   PRODUCT PRICE
// =====================
#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
pub struct ProductPrice {
    pub id: Option<i32>,
    pub product_id: i32,
    pub price: i32, // in cents
    pub created_at: String,
}

#[derive(Insertable, Deserialize)]
#[diesel(table_name = product_prices)]
pub struct NewProductPrice {
    pub product_id: i32,
    pub price: i32,
    pub created_at: String,
}

// =====================
//  TRANSACTION TYPE
// =====================
#[derive(Copy, Clone, Debug, AsExpression, FromSqlRow)]
#[diesel(sql_type = Text)]
pub enum TransactionType {
    In,
    Out,
}

// How to store it in the DB
impl diesel::serialize::ToSql<Text, Sqlite> for TransactionType {
    fn to_sql<'b>(
        &'b self,
        out: &mut diesel::serialize::Output<'b, '_, Sqlite>,
    ) -> diesel::serialize::Result {
        let val = match self {
            TransactionType::In => "in",
            TransactionType::Out => "out",
        };
        out.set_value(val);
        Ok(diesel::serialize::IsNull::No)
    }
}

// How to read from the DB
impl diesel::deserialize::FromSql<Text, Sqlite> for TransactionType {
    fn from_sql(
        bytes: <Sqlite as diesel::backend::Backend>::RawValue<'_>,
    ) -> diesel::deserialize::Result<Self> {
        let s = <String as diesel::deserialize::FromSql<Text, Sqlite>>::from_sql(bytes)?;
        match s.as_str() {
            "in" => Ok(TransactionType::In),
            "out" => Ok(TransactionType::Out),
            _ => Err(format!("Invalid transaction_type: {}", s).into()),
        }
    }
}

// =====================
//     TRANSACTION
// =====================

// DB struct
#[derive(Insertable)]
#[diesel(table_name = transactions)]
pub struct NewTransaction {
    pub user_id: i32,
    pub product_id: i32,
    pub category_id: Option<i32>,
    pub transaction_type: String, // e.g. "in" or "out"
    pub description: Option<String>,
    pub date: String,
}

// Client-sent payload
#[derive(Deserialize)]
pub struct TransactionPayload {
    pub product_id: Option<i32>,
    pub category_id: Option<i32>,
    pub transaction_type: String, // e.g. "in" or "out"
    pub amount: Option<i32>,
    pub description: Option<String>,
    pub date: String,
}

#[derive(Selectable, Queryable, Serialize, Deserialize, Debug)]
pub struct Transaction {
    pub id: Option<i32>,
    pub user_id: i32,
    pub product_id: i32,
    pub category_id: Option<i32>,
    pub transaction_type: String, // or TransactionType
    pub description: Option<String>,
    pub date: String,
}
