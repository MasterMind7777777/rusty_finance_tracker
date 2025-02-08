use crate::domain::analytics::models::{
    CategorySpending, ProductPriceData, SpendingTimeSeriesEntry,
};
use crate::{error_response, AppState, JsonResult};
use axum::{
    debug_handler,
    extract::{Extension, Query, State},
    Json,
};
use chrono::{NaiveDate, NaiveDateTime};
use diesel::dsl::sql;
use diesel::prelude::*;
use diesel::sql_types::{BigInt, Date, Nullable};
use std::sync::Arc;

#[debug_handler]
pub async fn spending_time_series(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> JsonResult<Vec<SpendingTimeSeriesEntry>> {
    use crate::schema::product_prices::dsl as pp;
    use crate::schema::transactions::dsl as tx;

    let mut conn = match state.pool.get() {
        Ok(c) => c,
        Err(_) => return Err(error_response("Failed to fetch connection from pool")),
    };

    // Group by only the date portion (ignoring the time) so that transactions on the same day are aggregated.
    let query = tx::transactions
        .filter(tx::user_id.eq(logged_in_user_id))
        .inner_join(pp::product_prices.on(pp::id.eq(tx::product_price_id)))
        .select((
            sql::<Date>("DATE(transactions.date)"),
            sql::<Nullable<BigInt>>("SUM(product_prices.price)"),
        ))
        .group_by(sql::<Date>("DATE(transactions.date)"))
        .order(sql::<Date>("DATE(transactions.date)"));

    let result = match query.load::<(NaiveDate, Option<i64>)>(&mut conn) {
        Ok(rows) => rows,
        Err(e) => return Err(error_response(format!("Query error: {}", e))),
    };

    let data = result
        .into_iter()
        .map(|(date, total)| {
            // Sum is returned in cents; clamp to a safe maximum and convert to dollars.
            let cents = total.unwrap_or(0).clamp(0, i32::MAX as i64);
            let dollars = (cents as f64) / 100.0;
            SpendingTimeSeriesEntry {
                date: date.format("%Y-%m-%d").to_string(),
                total_spending: (dollars * 100.0).round() / 100.0, // rounded to 2 decimal places
            }
        })
        .collect();

    Ok(Json(data))
}

#[debug_handler]
pub async fn category_spending(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> JsonResult<Vec<CategorySpending>> {
    use crate::schema::categories::dsl as cat;
    use crate::schema::product_prices::dsl as pp;
    use crate::schema::products::dsl as pr;
    use crate::schema::transactions::dsl as tx;

    let mut conn = match state.pool.get() {
        Ok(c) => c,
        Err(_) => return Err(error_response("Failed to fetch connection from pool")),
    };

    let query = tx::transactions
        .filter(tx::user_id.eq(logged_in_user_id))
        .inner_join(pr::products.on(pr::id.eq(tx::product_id)))
        .filter(pr::category_id.is_not_null())
        .inner_join(cat::categories.on(pr::category_id.eq(cat::id.nullable())))
        .inner_join(pp::product_prices.on(pp::id.eq(tx::product_price_id)))
        .select((
            cat::name,
            sql::<Nullable<BigInt>>("SUM(product_prices.price)"),
        ))
        .group_by(cat::name)
        .order(cat::name.asc());

    let result = match query.load::<(String, Option<i64>)>(&mut conn) {
        Ok(rows) => rows,
        Err(e) => return Err(error_response(format!("Query error: {}", e))),
    };

    let data = result
        .into_iter()
        .map(|(name, total)| {
            let cents = total.unwrap_or(0).clamp(0, i32::MAX as i64);
            let dollars = (cents as f64) / 100.0;
            CategorySpending {
                category_name: name,
                total_spending: (dollars * 100.0).round() / 100.0, // rounded to 2 decimal places
            }
        })
        .collect();

    Ok(Json(data))
}

#[derive(Debug, serde::Deserialize)]
pub struct ProductPriceQuery {
    pub product_id: i32,
}

#[debug_handler]
pub async fn product_price_data(
    State(state): State<Arc<AppState>>,
    Extension(_logged_in_user_id): Extension<i32>,
    Query(query): Query<ProductPriceQuery>,
) -> JsonResult<Vec<ProductPriceData>> {
    use crate::schema::product_prices::dsl::*;

    let mut conn = match state.pool.get() {
        Ok(c) => c,
        Err(_) => return Err(error_response("Failed to fetch connection from pool")),
    };

    let query = product_prices
        .filter(product_id.eq(query.product_id))
        .order(created_at.asc())
        .select((created_at, price));

    let result = match query.load::<(NaiveDateTime, i32)>(&mut conn) {
        Ok(rows) => rows,
        Err(e) => return Err(error_response(format!("Query error: {}", e))),
    };

    let data = result
        .into_iter()
        .map(|(dt, p)| {
            // Convert from cents to dollars.
            let raw_price = p as f64 / 100.0;
            let price_formatted = (raw_price * 100.0).round() / 100.0;
            ProductPriceData {
                date: dt.format("%Y-%m-%d").to_string(),
                price: price_formatted,
            }
        })
        .collect();

    Ok(Json(data))
}
