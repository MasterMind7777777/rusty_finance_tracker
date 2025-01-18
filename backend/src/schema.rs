// @generated automatically by Diesel CLI.

diesel::table! {
    categories (id) {
        id -> Int4,
        parent_category_id -> Nullable<Int4>,
        name -> Text,
        user_id -> Int4,
    }
}

diesel::table! {
    product_prices (id) {
        id -> Int4,
        product_id -> Int4,
        price -> Int4,
        created_at -> Timestamp,
    }
}

diesel::table! {
    products (id) {
        id -> Int4,
        user_id -> Int4,
        name -> Text,
    }
}

diesel::table! {
    tags (id) {
        id -> Int4,
        name -> Text,
        user_id -> Int4,
    }
}

diesel::table! {
    transaction_tags (transaction_id, tag_id) {
        transaction_id -> Int4,
        tag_id -> Int4,
    }
}

diesel::table! {
    transactions (id) {
        id -> Int4,
        user_id -> Int4,
        product_id -> Int4,
        category_id -> Nullable<Int4>,
        transaction_type -> Text,
        description -> Nullable<Text>,
        date -> Timestamp,
    }
}

diesel::table! {
    users (id) {
        id -> Int4,
        email -> Text,
        password_hash -> Text,
    }
}

diesel::joinable!(categories -> users (user_id));
diesel::joinable!(product_prices -> products (product_id));
diesel::joinable!(products -> users (user_id));
diesel::joinable!(tags -> users (user_id));
diesel::joinable!(transaction_tags -> tags (tag_id));
diesel::joinable!(transaction_tags -> transactions (transaction_id));
diesel::joinable!(transactions -> categories (category_id));
diesel::joinable!(transactions -> products (product_id));
diesel::joinable!(transactions -> users (user_id));

diesel::allow_tables_to_appear_in_same_query!(
    categories,
    product_prices,
    products,
    tags,
    transaction_tags,
    transactions,
    users,
);
