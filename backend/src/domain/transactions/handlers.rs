use axum::{
    debug_handler,
    extract::{Extension, State},
    Json,
};
use diesel::prelude::*;
use diesel::result::{DatabaseErrorKind, Error as DieselError};
use std::sync::Arc;

use crate::{
    domain::tags::models::{NewTag, Tag, TagDto, TagReference},
    error_response, AppState, JsonResult,
};

use super::models::{
    CreateTransactionResponse, NewTransaction, Transaction, TransactionDto, TransactionPayload,
};

// For creating a product when product_id is not provided.
use crate::domain::products::models::{NewProduct, Product};
// For creating product prices.
use crate::domain::product_prices::models::{NewProductPrice, ProductPrice, ProductPriceDto};
// For tag handling; assume these come from shared models.

#[debug_handler]
pub async fn create_transaction(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
    Json(payload): Json<TransactionPayload>,
) -> JsonResult<CreateTransactionResponse> {
    use crate::schema::product_prices::dsl as pp;
    use crate::schema::products::dsl as pr;
    use crate::schema::tags::dsl as tags_dsl;
    use crate::schema::transaction_tags::dsl as tt_dsl;
    use crate::schema::transactions::dsl as tx;

    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let result = conn.transaction::<CreateTransactionResponse, DieselError, _>(|txn_conn| {
        // 1) Determine final product ID.
        let final_product_id = match payload.product_id {
            Some(pid) => pid,
            None => {
                let name = payload
                    .product_name
                    .as_ref()
                    .ok_or_else(|| DieselError::RollbackTransaction)?
                    .trim();
                if name.is_empty() {
                    return Err(DieselError::RollbackTransaction);
                }
                let new_prod = NewProduct {
                    user_id: logged_in_user_id,
                    category_id: None,
                    name: name.to_string(),
                };
                diesel::insert_into(pr::products)
                    .values(&new_prod)
                    .returning(pr::id)
                    .get_result::<i32>(txn_conn)?
            }
        };

        // 2) Determine final product price ID.
        let final_price_id = if let Some(pp_id) = payload.product_price_id {
            pp_id
        } else {
            let cents = (payload.price.unwrap_or(0.0) * 100.0) as i32;
            let new_price = NewProductPrice {
                product_id: final_product_id,
                price: cents,
                created_at: payload.date,
            };
            diesel::insert_into(pp::product_prices)
                .values(&new_price)
                .returning(pp::id)
                .get_result::<i32>(txn_conn)?
        };

        // 3) Insert the transaction.
        let new_tx = NewTransaction {
            user_id: logged_in_user_id,
            product_id: final_product_id,
            product_price_id: final_price_id,
            transaction_type: payload.transaction_type,
            description: payload.description.clone(),
            date: payload.date,
        };
        let inserted_tx = diesel::insert_into(tx::transactions)
            .values(&new_tx)
            .get_result::<Transaction>(txn_conn)?;

        // 4) Fetch the product.
        let fetched_product = pr::products
            .filter(pr::id.eq(final_product_id))
            .first::<Product>(txn_conn)?;

        // 5) Fetch the raw product price.
        let fetched_price = pp::product_prices
            .filter(pp::id.eq(final_price_id))
            .first::<ProductPrice>(txn_conn)?;

        let price_dto = ProductPriceDto {
            id: fetched_price.id,
            product_id: fetched_price.product_id,
            price: fetched_price.price as f64 / 100.0,
            created_at: fetched_price.created_at,
        };

        // 6) Handle tags.
        // Ensure TagReference derives Clone in its definition:
        // #[derive(Clone, Deserialize)]  // Add Debug if desired.
        let final_tag_ids = if let Some(tag_refs) = &payload.tags {
            let mut ids = Vec::new();
            for tag_ref in tag_refs.iter().cloned() {
                match tag_ref {
                    TagReference::Id(tid) => {
                        ids.push(tid);
                    }
                    TagReference::Name(name) => {
                        let existing_tag: Option<Tag> = tags_dsl::tags
                            .filter(tags_dsl::name.eq(&name))
                            .filter(tags_dsl::user_id.eq(logged_in_user_id))
                            .first::<Tag>(txn_conn)
                            .optional()?;
                        let tag_id = if let Some(tag) = existing_tag {
                            tag.id
                        } else {
                            let new_tag = NewTag {
                                name: name.clone(),
                                user_id: logged_in_user_id,
                            };
                            diesel::insert_into(tags_dsl::tags)
                                .values(&new_tag)
                                .returning(tags_dsl::id)
                                .get_result::<i32>(txn_conn)?
                        };
                        ids.push(tag_id);
                    }
                }
            }
            Some(ids)
        } else {
            None
        };

        if let Some(tag_ids) = final_tag_ids {
            for tag_id in tag_ids {
                diesel::insert_into(tt_dsl::transaction_tags)
                    .values((
                        tt_dsl::transaction_id.eq(inserted_tx.id),
                        tt_dsl::tag_id.eq(tag_id),
                    ))
                    .execute(txn_conn)?;
            }
        }

        // 7) Fetch associated tags.
        let associated_tags = tt_dsl::transaction_tags
            .inner_join(tags_dsl::tags.on(tt_dsl::tag_id.eq(tags_dsl::id)))
            .filter(tt_dsl::transaction_id.eq(inserted_tx.id))
            .select(tags_dsl::tags::all_columns())
            .load::<Tag>(txn_conn)?;

        let response_tags = associated_tags
            .into_iter()
            .map(|tag| TagDto {
                id: tag.id,
                name: tag.name,
            })
            .collect();

        Ok(CreateTransactionResponse {
            transaction: inserted_tx,
            product: fetched_product,
            product_price: price_dto,
            tags: response_tags,
        })
    });

    match result {
        Ok(resp) => Ok(Json(resp)),
        Err(DieselError::DatabaseError(DatabaseErrorKind::UniqueViolation, _)) => {
            Err(error_response("Duplicate transaction entry"))
        }
        Err(e) => Err(error_response(format!("Failed to create transaction: {e}"))),
    }
}

#[debug_handler]
pub async fn list_transactions(
    State(state): State<Arc<AppState>>,
    Extension(logged_in_user_id): Extension<i32>,
) -> JsonResult<Vec<TransactionDto>> {
    use crate::schema::transactions::dsl::*;
    let mut conn = state
        .pool
        .get()
        .map_err(|_| error_response("Failed to fetch connection from pool"))?;

    let user_transactions = transactions
        .filter(user_id.eq(logged_in_user_id))
        .load::<Transaction>(&mut conn)
        .map_err(|e| error_response(format!("Failed to load transactions: {e}")))?;

    let tag_map = {
        use crate::schema::tags::dsl::*;
        use crate::schema::transaction_tags::dsl::*;
        let tx_ids: Vec<i32> = user_transactions.iter().map(|tx| tx.id).collect();
        transaction_tags
            .inner_join(tags)
            .filter(transaction_id.eq_any(tx_ids))
            .select((transaction_id, tags::all_columns()))
            .load::<(i32, Tag)>(&mut conn)
            .map_err(|e| error_response(format!("Failed to load tags: {e}")))?
    };

    let user_transactions_dto = user_transactions
        .into_iter()
        .map(|tx| {
            let tags_for_tx = tag_map
                .iter()
                .filter_map(|(tid, t)| if *tid == tx.id { Some(t.id) } else { None })
                .collect();
            TransactionDto {
                id: tx.id,
                user_id: tx.user_id,
                product_id: tx.product_id,
                product_price_id: tx.product_price_id,
                transaction_type: tx.transaction_type,
                description: tx.description.clone(),
                date: tx.date,
                tags: tags_for_tx,
            }
        })
        .collect();

    Ok(Json(user_transactions_dto))
}
