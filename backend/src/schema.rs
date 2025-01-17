// @generated automatically by Diesel CLI.

diesel::table! {
    categories (id) {
        id -> Nullable<Integer>,
        parent_category_id -> Nullable<Integer>,
        name -> Text,
        user_id -> Integer,
    }
}

diesel::table! {
    product_prices (id) {
        id -> Nullable<Integer>,
        product_id -> Integer,
        price -> Integer,
        created_at -> Text,
    }
}

diesel::table! {
    products (id) {
        id -> Nullable<Integer>,
        user_id -> Integer,
        name -> Text,
    }
}

diesel::table! {
    tags (id) {
        id -> Nullable<Integer>,
        name -> Text,
        user_id -> Integer,
    }
}

diesel::table! {
    transaction_tags (transaction_id, tag_id) {
        transaction_id -> Integer,
        tag_id -> Integer,
    }
}

diesel::table! {
    transactions (id) {
        id -> Nullable<Integer>,
        user_id -> Integer,
        product_id -> Nullable<Integer>,
        category_id -> Nullable<Integer>,
        transaction_type -> Text,
        amount -> Integer,
        description -> Nullable<Text>,
        date -> Text,
    }
}

diesel::table! {
    users (id) {
        id -> Nullable<Integer>,
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
