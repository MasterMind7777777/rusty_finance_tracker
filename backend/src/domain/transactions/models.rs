use crate::domain::product_prices::models::ProductPriceDto; // From product_prices module.
use crate::domain::products::models::Product; // Assuming Product lives here.
use crate::domain::tags::models::TagDto;
use crate::domain::tags::models::TagReference;
use crate::schema::transactions;
use chrono::NaiveDateTime;
use diesel::sql_types::Text;
use diesel::{AsExpression, FromSqlRow, Insertable, Queryable};
use serde::{Deserialize, Serialize}; // Assuming tags are defined in a shared models file.

// Transaction type enum.
#[derive(Copy, Clone, Debug, PartialEq, Eq, AsExpression, FromSqlRow, Serialize, Deserialize)]
#[diesel(sql_type = Text)]
pub enum TransactionType {
    Expense,
    Income,
}

// Implement ToSql and FromSql for TransactionType.
use diesel::pg::Pg;
use diesel::serialize::{self, IsNull, Output, ToSql};
use std::io::Write;

impl ToSql<Text, Pg> for TransactionType {
    fn to_sql(&self, out: &mut Output<'_, '_, Pg>) -> serialize::Result {
        match self {
            TransactionType::Expense => out.write_all(b"expense")?,
            TransactionType::Income => out.write_all(b"income")?,
        }
        Ok(IsNull::No)
    }
}

impl diesel::deserialize::FromSql<Text, Pg> for TransactionType {
    fn from_sql(
        bytes: <Pg as diesel::backend::Backend>::RawValue<'_>,
    ) -> diesel::deserialize::Result<Self> {
        let s = <String as diesel::deserialize::FromSql<Text, Pg>>::from_sql(bytes)?;
        match s.as_str() {
            "expense" => Ok(TransactionType::Expense),
            "income" => Ok(TransactionType::Income),
            _ => Err(format!("Invalid transaction_type: {}", s).into()),
        }
    }
}

/// The main Transaction record.
#[derive(diesel::Selectable, Queryable, Serialize, Deserialize, Debug)]
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

/// Used for inserting a new transaction.
#[derive(Insertable, Deserialize)]
#[diesel(table_name = transactions)]
pub struct NewTransaction {
    pub user_id: i32,
    pub product_id: i32,
    pub product_price_id: i32,
    pub transaction_type: TransactionType,
    pub description: Option<String>,
    pub date: NaiveDateTime,
}

/// The payload that the client sends when creating a transaction.
#[derive(Deserialize)]
pub struct TransactionPayload {
    pub product_id: Option<i32>, // optional: if not provided, a product is created
    pub product_name: Option<String>, // used if product_id is None
    pub product_price_id: Option<i32>, // optional: if not provided, a new price is created
    pub price: Option<f64>,      // in dollars; used if product_price_id is None
    pub transaction_type: TransactionType,
    pub description: Option<String>,
    pub date: NaiveDateTime,
    pub tags: Option<Vec<TagReference>>, // tag references (either id or name)
}

/// The response after creating a transaction.
#[derive(Serialize)]
pub struct CreateTransactionResponse {
    pub transaction: Transaction,
    pub product: Product,
    pub product_price: ProductPriceDto,
    pub tags: Vec<TagDto>,
}

/// DTO for listing transactions.
#[derive(Serialize)]
pub struct TransactionDto {
    pub id: i32,
    pub user_id: i32,
    pub product_id: i32,
    pub product_price_id: i32,
    pub transaction_type: TransactionType,
    pub description: Option<String>,
    pub date: NaiveDateTime,
    pub tags: Vec<i32>, // List of tag IDs.
}
