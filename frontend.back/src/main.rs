use chrono::{DateTime, Utc};
use std::i32;

use gloo_net::http::Request;
use serde::{Deserialize, Serialize};
use wasm_bindgen::JsCast;
use yew::prelude::*;

// ==================== Models (matching backend) ====================

// ----- Auth & Users -----
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LoginRequest {
    pub email: String,
    pub password_hash: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TokenResponse {
    pub token: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NewUser {
    pub email: String,
    pub password_hash: String,
}

// ----- Categories -----
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Category {
    pub id: Option<i32>,
    pub name: String,
    pub parent_id: Option<i32>,
    #[serde(skip_serializing)] // Skip when sending to backend
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CategoryPayload {
    pub name: String,
    pub parent_category_id: Option<i32>,
}

// ----- Products -----
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Product {
    pub id: Option<i32>,
    pub user_id: i32,
    pub name: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProductPayload {
    pub name: String,
}

// ----- Product Prices -----
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct NewProductPrice {
    pub product_id: i32,
    pub price: i32,
    pub start_date: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ProductPrice {
    pub id: Option<i32>,
    pub product_id: i32,
    pub price: i32,
    pub start_date: String,
    pub end_date: Option<String>,
}

// ----- Transactions -----
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TransactionPayload {
    pub product_id: Option<i32>,
    pub category_id: i32,
    pub transaction_type: String,
    pub amount: f64,
    pub description: String,
    pub date: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Transaction {
    pub id: Option<i32>,
    pub user_id: i32,
    pub product_id: Option<i32>,
    pub category_id: i32,
    pub transaction_type: String,
    pub amount: f64,
    pub description: String,
    pub date: String,
}

// ==================== Reusable Autocomplete Component ====================
//
// This component can autocomplete a list of (ID+Name)-like items
// (e.g., Category or Product). The parent passes:
//   - items: full list of T
//   - get_label: function to display item
//   - get_id: function to get item's ID
//   - on_select: callback with (id, name) or with the entire T
//   - placeholder: optional placeholder text

#[derive(Properties, PartialEq)]
pub struct AutocompleteProps<T: Clone + PartialEq + 'static> {
    pub items: Vec<T>,
    pub get_label: Callback<T, String>,
    pub get_id: Callback<T, i32>,
    pub on_select: Callback<(i32, String)>,
    #[prop_or_default]
    pub placeholder: String,
}

#[function_component(Autocomplete)]
pub fn autocomplete<T: Clone + PartialEq + 'static>(props: &AutocompleteProps<T>) -> Html {
    let items = props.items.clone();
    let placeholder = props.placeholder.clone();

    let input_text = use_state(|| "".to_string());
    let show_suggestions = use_state(|| false);

    let typed = input_text.to_lowercase();
    let suggestions: Vec<T> = {
        let get_label_for_filter = props.get_label.clone();
        items
            .iter()
            .cloned()
            .filter(move |item| {
                let label = get_label_for_filter.emit(item.clone()).to_lowercase();
                label.contains(&typed)
            })
            .collect()
    };

    let on_click_suggestion = {
        let get_label_for_click = props.get_label.clone();
        let get_id_for_click = props.get_id.clone();
        let on_select_for_click = props.on_select.clone();
        let input_text = input_text.clone();
        let show_suggestions = show_suggestions.clone();

        move |item: T| {
            let label = get_label_for_click.emit(item.clone());
            let id = get_id_for_click.emit(item);
            input_text.set(label.clone());
            show_suggestions.set(false);
            on_select_for_click.emit((id, label));
        }
    };

    let on_input_change = {
        let input_text = input_text.clone();
        let show_suggestions = show_suggestions.clone();
        move |e: InputEvent| {
            if let Some(input_elem) = e
                .target()
                .and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok())
            {
                input_text.set(input_elem.value());
                show_suggestions.set(true);
            }
        }
    };

    let suggestions_list = if *show_suggestions && !suggestions.is_empty() {
        let get_label_for_list = props.get_label.clone();
        html! {
            <ul style="border: 1px solid #ccc; margin: 0; padding: 0; list-style: none; max-height: 150px; overflow: auto;">
            {
                for suggestions.into_iter().map(move |item| {
                    let label = get_label_for_list.emit(item.clone());
                    let on_click_suggestion = on_click_suggestion.clone();
                    html! {
                        <li
                            style="padding: 0.25rem; cursor: pointer; border-bottom: 1px solid #eee;"
                            onclick={Callback::from(move |_| {
                                on_click_suggestion(item.clone())
                            })}
                        >
                            { label }
                        </li>
                    }
                })
            }
            </ul>
        }
    } else {
        html! {}
    };

    html! {
        <div style="position: relative;">
            <input
                type="text"
                value={(*input_text).clone()}
                placeholder={placeholder}
                oninput={on_input_change}
            />
            { suggestions_list }
        </div>
    }
}

// ==================== Main App ====================

#[function_component(App)]
fn app() -> Html {
    // ----------- Global Settings/States -----------
    let backend_url = use_state(|| "http://127.0.0.1:3000".to_string());
    let token = use_state(|| None::<String>);

    // ----------- Sign Up -----------
    let signup_email = use_state(|| "".to_string());
    let signup_password = use_state(|| "".to_string());
    let signup_message = use_state(|| "".to_string()); // store success/failure message

    // Sign-up button callback
    let on_signup = {
        let signup_email = signup_email.clone();
        let signup_password = signup_password.clone();
        let signup_message = signup_message.clone();
        let backend_url = backend_url.clone();

        Callback::from(move |e: MouseEvent| {
            e.prevent_default();

            let signup_email = signup_email.clone();
            let signup_password = signup_password.clone();
            let signup_message = signup_message.clone();
            let backend_url = (*backend_url).clone();

            wasm_bindgen_futures::spawn_local(async move {
                let new_user = NewUser {
                    email: (*signup_email).clone(),
                    password_hash: (*signup_password).clone(),
                };

                let body = match serde_json::to_string(&new_user) {
                    Ok(b) => b,
                    Err(err) => {
                        signup_message.set(format!("Failed to serialize user: {}", err));
                        return;
                    }
                };

                let request = match Request::post(&format!("{}/users", backend_url))
                    .header("Content-Type", "application/json")
                    .body(body)
                {
                    Ok(req) => req,
                    Err(err) => {
                        signup_message.set(format!("Failed to build request: {}", err));
                        return;
                    }
                };

                match request.send().await {
                    Ok(response) => {
                        let text = response.text().await.unwrap_or_default();
                        if response.status() == 200 {
                            signup_message.set(format!("Sign-up result: {}", text));
                        } else {
                            signup_message.set(format!("Sign-up error: {}", text));
                        }
                    }
                    Err(err) => {
                        signup_message.set(format!("Request failed: {}", err));
                    }
                }
            });
        })
    };

    // ----------- Login -----------
    let email = use_state(|| "".to_string());
    let password = use_state(|| "".to_string());

    let on_login = {
        let email = email.clone();
        let password = password.clone();
        let token = token.clone();
        let backend_url = backend_url.clone();

        Callback::from(move |e: MouseEvent| {
            e.prevent_default();

            let email = email.clone();
            let password = password.clone();
            let token = token.clone();
            let backend_url = (*backend_url).clone();

            wasm_bindgen_futures::spawn_local(async move {
                let login_req = LoginRequest {
                    email: (*email).clone(),
                    password_hash: (*password).clone(),
                };

                let body = match serde_json::to_string(&login_req) {
                    Ok(b) => b,
                    Err(err) => {
                        web_sys::console::log_1(
                            &format!("Failed to serialize login request: {}", err).into(),
                        );
                        return;
                    }
                };

                let request = match Request::post(&format!("{}/login", backend_url))
                    .header("Content-Type", "application/json")
                    .body(body)
                {
                    Ok(r) => r,
                    Err(err) => {
                        web_sys::console::log_1(
                            &format!("Failed to build login request: {}", err).into(),
                        );
                        return;
                    }
                };

                match request.send().await {
                    Ok(response) => {
                        if response.status() == 200 {
                            match response.json::<TokenResponse>().await {
                                Ok(json) => {
                                    token.set(Some(json.token));
                                }
                                Err(e) => {
                                    web_sys::console::log_1(
                                        &format!("Failed to parse token: {}", e).into(),
                                    );
                                }
                            }
                        } else {
                            let text = response.text().await.unwrap_or_default();
                            web_sys::console::log_1(&format!("Login error: {}", text).into());
                        }
                    }
                    Err(err) => {
                        web_sys::console::log_1(&format!("Request failed: {}", err).into());
                    }
                }
            });
        })
    };

    // =========== Categories ===========
    let category_name = use_state(|| "".to_string());
    let categories = use_state(Vec::<Category>::new);
    let parent_id_selected = use_state(|| None::<i32>);

    // Refresh categories from server
    let fetch_categories = {
        let token = token.clone();
        let backend_url = backend_url.clone();
        let categories = categories.clone();

        move || {
            let token_val = token.clone();
            let backend_url = (*backend_url).clone();
            let categories_state = categories.clone();

            wasm_bindgen_futures::spawn_local(async move {
                if token_val.is_none() {
                    web_sys::console::log_1(&"No token, can't fetch categories.".into());
                    return;
                }

                let t = token_val.as_ref().unwrap();
                let request = Request::get(&format!("{}/categories", backend_url))
                    .header("Authorization", &format!("Bearer {}", t));

                match request.send().await {
                    Ok(response) => {
                        if response.status() == 200 {
                            match response.json::<Vec<Category>>().await {
                                Ok(cats) => {
                                    categories_state.set(cats);
                                }
                                Err(e) => {
                                    web_sys::console::log_1(
                                        &format!("JSON parse error (categories): {}", e).into(),
                                    );
                                }
                            }
                        } else {
                            let text = response.text().await.unwrap_or_default();
                            web_sys::console::log_1(
                                &format!("Error fetching categories: {}", text).into(),
                            );
                        }
                    }
                    Err(err) => {
                        web_sys::console::log_1(&format!("Request error: {}", err).into());
                    }
                }
            });
        }
    };

    // Create new category
    let on_create_category = {
        let token = token.clone();
        let backend_url = backend_url.clone();
        let categories = categories.clone();
        let category_name = category_name.clone();
        let parent_id_selected = parent_id_selected.clone();

        Callback::from(move |e: MouseEvent| {
            e.prevent_default();

            if token.is_none() {
                web_sys::console::log_1(&"No token, please log in.".into());
                return;
            }

            let token_val = token.as_ref().unwrap().clone();
            let backend_url = (*backend_url).clone();
            let categories = categories.clone();
            let name_val = (*category_name).clone();
            let parent_val = (*parent_id_selected).clone();

            wasm_bindgen_futures::spawn_local(async move {
                let payload = CategoryPayload {
                    name: name_val,
                    parent_category_id: parent_val,
                };

                let body = match serde_json::to_string(&payload) {
                    Ok(b) => b,
                    Err(e) => {
                        web_sys::console::log_1(
                            &format!("Failed to serialize category payload: {}", e).into(),
                        );
                        return;
                    }
                };

                let request = match Request::post(&format!("{}/categories", backend_url))
                    .header("Content-Type", "application/json")
                    .header("Authorization", &format!("Bearer {}", token_val))
                    .body(body)
                {
                    Ok(r) => r,
                    Err(e) => {
                        web_sys::console::log_1(
                            &format!("Request build error (category): {}", e).into(),
                        );
                        return;
                    }
                };

                match request.send().await {
                    Ok(response) => {
                        let text = response.text().await.unwrap_or_default();
                        if response.status() == 200 {
                            web_sys::console::log_1(&format!("Category creation: {}", text).into());
                            // Refresh categories
                            let resp_cats = Request::get(&format!("{}/categories", backend_url))
                                .header("Authorization", &format!("Bearer {}", token_val))
                                .send()
                                .await;

                            if let Ok(r) = resp_cats {
                                if r.status() == 200 {
                                    if let Ok(cats) = r.json::<Vec<Category>>().await {
                                        categories.set(cats);
                                    }
                                }
                            }
                        } else {
                            web_sys::console::log_1(
                                &format!("Category creation error: {}", text).into(),
                            );
                        }
                    }
                    Err(err) => {
                        web_sys::console::log_1(&format!("Request failed: {}", err).into());
                    }
                }
            });
        })
    };

    // =========== Products ===========
    let product_name = use_state(|| "".to_string());
    let products = use_state(Vec::<Product>::new);

    let fetch_products = {
        let token = token.clone();
        let backend_url = backend_url.clone();
        let products = products.clone();

        move || {
            let token_val = token.clone();
            let backend_url = (*backend_url).clone();
            let products_state = products.clone();

            wasm_bindgen_futures::spawn_local(async move {
                if token_val.is_none() {
                    web_sys::console::log_1(&"No token, can't fetch products.".into());
                    return;
                }

                let t = token_val.as_ref().unwrap();
                let request = Request::get(&format!("{}/products", backend_url))
                    .header("Authorization", &format!("Bearer {}", t));

                match request.send().await {
                    Ok(response) => {
                        if response.status() == 200 {
                            match response.json::<Vec<Product>>().await {
                                Ok(prods) => {
                                    products_state.set(prods);
                                }
                                Err(e) => {
                                    web_sys::console::log_1(
                                        &format!("JSON parse error (products): {}", e).into(),
                                    );
                                }
                            }
                        } else {
                            let text = response.text().await.unwrap_or_default();
                            web_sys::console::log_1(
                                &format!("Error fetching products: {}", text).into(),
                            );
                        }
                    }
                    Err(err) => {
                        web_sys::console::log_1(&format!("Request error: {}", err).into());
                    }
                }
            });
        }
    };

    let on_create_product = {
        let token = token.clone();
        let backend_url = backend_url.clone();
        let products = products.clone();
        let product_name = product_name.clone();

        Callback::from(move |e: MouseEvent| {
            e.prevent_default();

            if token.is_none() {
                web_sys::console::log_1(&"No token, please log in.".into());
                return;
            }

            let t = token.as_ref().unwrap().clone();
            let backend = (*backend_url).clone();
            let prods = products.clone();
            let name_val = (*product_name).clone();

            wasm_bindgen_futures::spawn_local(async move {
                let payload = ProductPayload { name: name_val };

                let body = match serde_json::to_string(&payload) {
                    Ok(b) => b,
                    Err(e) => {
                        web_sys::console::log_1(
                            &format!("Failed to serialize product payload: {}", e).into(),
                        );
                        return;
                    }
                };

                let request = match Request::post(&format!("{}/products", backend))
                    .header("Content-Type", "application/json")
                    .header("Authorization", &format!("Bearer {}", t))
                    .body(body)
                {
                    Ok(r) => r,
                    Err(e) => {
                        web_sys::console::log_1(
                            &format!("Request build error (product): {}", e).into(),
                        );
                        return;
                    }
                };

                match request.send().await {
                    Ok(response) => {
                        let text = response.text().await.unwrap_or_default();
                        if response.status() == 200 {
                            web_sys::console::log_1(&format!("Product creation: {}", text).into());
                            let resp_prods = Request::get(&format!("{}/products", backend))
                                .header("Authorization", &format!("Bearer {}", t))
                                .send()
                                .await;
                            if let Ok(r) = resp_prods {
                                if r.status() == 200 {
                                    if let Ok(prods_data) = r.json::<Vec<Product>>().await {
                                        prods.set(prods_data);
                                    }
                                }
                            }
                        } else {
                            web_sys::console::log_1(&format!("Product error: {}", text).into());
                        }
                    }
                    Err(err) => {
                        web_sys::console::log_1(&format!("Request failed: {}", err).into());
                    }
                }
            });
        })
    };

    // =========== Product Prices ===========
    let pp_product_id = use_state(|| None::<i32>);
    let pp_price = use_state(|| "".to_string());
    let pp_start_date = use_state(|| "".to_string());
    let product_prices = use_state(Vec::<ProductPrice>::new);

    let fetch_product_prices = {
        let token = token.clone();
        let backend_url = backend_url.clone();
        let product_prices = product_prices.clone();

        move || {
            let token_val = token.clone();
            let backend_url = (*backend_url).clone();
            let pp_state = product_prices.clone();

            wasm_bindgen_futures::spawn_local(async move {
                if token_val.is_none() {
                    web_sys::console::log_1(&"No token, can't fetch product prices.".into());
                    return;
                }

                let t = token_val.as_ref().unwrap();
                let request = Request::get(&format!("{}/product_prices", backend_url))
                    .header("Authorization", &format!("Bearer {}", t));

                match request.send().await {
                    Ok(response) => {
                        if response.status() == 200 {
                            match response.json::<Vec<ProductPrice>>().await {
                                Ok(pp_list) => {
                                    pp_state.set(pp_list);
                                }
                                Err(e) => {
                                    web_sys::console::log_1(
                                        &format!("JSON parse error (product prices): {}", e).into(),
                                    );
                                }
                            }
                        } else {
                            let text = response.text().await.unwrap_or_default();
                            web_sys::console::log_1(
                                &format!("Error fetching product prices: {}", text).into(),
                            );
                        }
                    }
                    Err(err) => {
                        web_sys::console::log_1(&format!("Request error: {}", err).into());
                    }
                }
            });
        }
    };

    let on_create_product_price = {
        let token = token.clone();
        let backend_url = backend_url.clone();
        let product_prices = product_prices.clone();
        let pp_product_id = pp_product_id.clone();
        let pp_price = pp_price.clone();
        let pp_start_date = pp_start_date.clone();

        Callback::from(move |e: MouseEvent| {
            e.prevent_default();

            if token.is_none() {
                web_sys::console::log_1(&"No token, please log in.".into());
                return;
            }
            if pp_product_id.is_none() {
                web_sys::console::log_1(&"No product selected.".into());
                return;
            }

            let t = token.as_ref().unwrap().clone();
            let backend = (*backend_url).clone();
            let product_prices = product_prices.clone();
            let pid = (*pp_product_id).unwrap_or(0);
            let price_val = (*pp_price).clone().parse::<i32>().unwrap_or(0);
            let start_val = (*pp_start_date).clone();

            wasm_bindgen_futures::spawn_local(async move {
                let payload = NewProductPrice {
                    product_id: pid,
                    price: price_val,
                    start_date: start_val,
                };

                let body = match serde_json::to_string(&payload) {
                    Ok(b) => b,
                    Err(e) => {
                        web_sys::console::log_1(
                            &format!("Failed to serialize product price payload: {}", e).into(),
                        );
                        return;
                    }
                };

                let request = match Request::post(&format!("{}/product_prices", backend))
                    .header("Content-Type", "application/json")
                    .header("Authorization", &format!("Bearer {}", t))
                    .body(body)
                {
                    Ok(r) => r,
                    Err(e) => {
                        web_sys::console::log_1(
                            &format!("Request build error (product price): {}", e).into(),
                        );
                        return;
                    }
                };

                match request.send().await {
                    Ok(response) => {
                        let text = response.text().await.unwrap_or_default();
                        if response.status() == 200 {
                            web_sys::console::log_1(
                                &format!("Product price creation: {}", text).into(),
                            );
                            // Refresh product prices
                            let resp_pp = Request::get(&format!("{}/product_prices", backend))
                                .header("Authorization", &format!("Bearer {}", t))
                                .send()
                                .await;
                            if let Ok(r) = resp_pp {
                                if r.status() == 200 {
                                    if let Ok(pp_list) = r.json::<Vec<ProductPrice>>().await {
                                        product_prices.set(pp_list);
                                    }
                                }
                            }
                        } else {
                            web_sys::console::log_1(
                                &format!("Product price error: {}", text).into(),
                            );
                        }
                    }
                    Err(err) => {
                        web_sys::console::log_1(&format!("Request failed: {}", err).into());
                    }
                }
            });
        })
    };

    // =========== Transactions ===========
    let tx_product_id = use_state(|| None::<i32>);
    let tx_category_id = use_state(|| None::<i32>);
    let tx_type = use_state(|| "expense".to_string());
    let tx_amount = use_state(|| "".to_string());
    let tx_description = use_state(|| "".to_string());
    let tx_date = use_state(|| "".to_string());
    let transactions = use_state(Vec::<Transaction>::new);

    let fetch_transactions = {
        let token = token.clone();
        let backend_url = backend_url.clone();
        let transactions = transactions.clone();

        move || {
            let token_val = token.clone();
            let backend_url = (*backend_url).clone();
            let tx_state = transactions.clone();

            wasm_bindgen_futures::spawn_local(async move {
                if token_val.is_none() {
                    web_sys::console::log_1(&"No token, can't fetch transactions.".into());
                    return;
                }

                let t = token_val.as_ref().unwrap();
                let request = Request::get(&format!("{}/transactions", backend_url))
                    .header("Authorization", &format!("Bearer {}", t));

                match request.send().await {
                    Ok(response) => {
                        if response.status() == 200 {
                            match response.json::<Vec<Transaction>>().await {
                                Ok(tx_list) => {
                                    tx_state.set(tx_list);
                                }
                                Err(e) => {
                                    web_sys::console::log_1(
                                        &format!("JSON parse error (transactions): {}", e).into(),
                                    );
                                }
                            }
                        } else {
                            let text = response.text().await.unwrap_or_default();
                            web_sys::console::log_1(
                                &format!("Error fetching transactions: {}", text).into(),
                            );
                        }
                    }
                    Err(err) => {
                        web_sys::console::log_1(&format!("Request error: {}", err).into());
                    }
                }
            });
        }
    };

    let on_create_transaction = {
        let token = token.clone();
        let backend_url = backend_url.clone();
        let tx_product_id = tx_product_id.clone();
        let tx_category_id = tx_category_id.clone();
        let tx_type = tx_type.clone();
        let tx_amount = tx_amount.clone();
        let tx_description = tx_description.clone();
        let tx_date = tx_date.clone();
        let transactions = transactions.clone();

        Callback::from(move |e: MouseEvent| {
            e.prevent_default();

            if token.is_none() {
                web_sys::console::log_1(&"No token, please log in first.".into());
                return;
            }
            if tx_category_id.is_none() {
                web_sys::console::log_1(&"No category selected.".into());
                return;
            }

            let token_val = token.as_ref().unwrap().clone();
            let backend = (*backend_url).clone();
            let transactions = transactions.clone();
            let prod_id = (*tx_product_id).clone();
            let cat_id = (*tx_category_id).clone().unwrap_or(0);
            let ttype = (*tx_type).clone();
            let amt = (*tx_amount).clone().parse::<f64>().unwrap_or(0.0);
            let desc = (*tx_description).clone();
            let dt = (*tx_date).clone();

            wasm_bindgen_futures::spawn_local(async move {
                let payload = TransactionPayload {
                    product_id: prod_id,
                    category_id: cat_id,
                    transaction_type: ttype,
                    amount: amt,
                    description: desc,
                    date: dt,
                };

                let body = match serde_json::to_string(&payload) {
                    Ok(b) => b,
                    Err(e) => {
                        web_sys::console::log_1(
                            &format!("Failed to serialize transaction payload: {}", e).into(),
                        );
                        return;
                    }
                };

                let request = match Request::post(&format!("{}/transactions", backend))
                    .header("Content-Type", "application/json")
                    .header("Authorization", &format!("Bearer {}", token_val))
                    .body(body)
                {
                    Ok(r) => r,
                    Err(e) => {
                        web_sys::console::log_1(
                            &format!("Request build error (transaction): {}", e).into(),
                        );
                        return;
                    }
                };

                match request.send().await {
                    Ok(response) => {
                        let text = response.text().await.unwrap_or_default();
                        if response.status() == 200 {
                            web_sys::console::log_1(
                                &format!("Transaction creation: {}", text).into(),
                            );
                            // Refresh transactions
                            let r = Request::get(&format!("{}/transactions", backend))
                                .header("Authorization", &format!("Bearer {}", token_val))
                                .send()
                                .await;
                            if let Ok(rr) = r {
                                if rr.status() == 200 {
                                    if let Ok(tx_list) = rr.json::<Vec<Transaction>>().await {
                                        transactions.set(tx_list);
                                    }
                                }
                            }
                        } else {
                            web_sys::console::log_1(&format!("Transaction error: {}", text).into());
                        }
                    }
                    Err(err) => {
                        web_sys::console::log_1(&format!("Request failed: {}", err).into());
                    }
                }
            });
        })
    };

    // =========== On mount, auto-fetch categories & products so autocomplete is ready ===========
    {
        let fetch_categories = fetch_categories.clone();
        let fetch_products = fetch_products.clone();
        use_effect_with((), move |_| {
            fetch_categories();
            fetch_products();
            || ()
        });
    }

    // ==================== UI Rendering ====================
    html! {
        <div style="padding: 1rem; font-family: sans-serif; max-width: 900px;">
            <h1>{ "Finance Tracker Frontend (Autocomplete Demo)" }</h1>

            // ---------- Sign Up Section ----------
            <div style="border: 1px solid #ccc; padding: 0.5rem; margin-bottom: 1rem;">
                <h2>{"Sign Up"}</h2>
                <input
                    type="text"
                    placeholder="New user email"
                    value={(*signup_email).clone()}
                    oninput={Callback::from({
                        let signup_email = signup_email.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                signup_email.set(input.value());
                            }
                        }
                    })}
                />
                <br />
                <input
                    type="password"
                    placeholder="New user password"
                    value={(*signup_password).clone()}
                    oninput={Callback::from({
                        let signup_password = signup_password.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                signup_password.set(input.value());
                            }
                        }
                    })}
                />
                <br />
                <button onclick={on_signup}>{"Sign Up"}</button>
                <p>{(*signup_message).clone()}</p>
            </div>

            // ---------- Login Section ----------
            <div style="border: 1px solid #ccc; padding: 0.5rem; margin-bottom: 1rem;">
                <h2>{"Login"}</h2>
                <input
                    type="text"
                    placeholder="Email"
                    value={(*email).clone()}
                    oninput={Callback::from({
                        let email = email.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                email.set(input.value());
                            }
                        }
                    })}
                />
                <br />
                <input
                    type="password"
                    placeholder="Password"
                    value={(*password).clone()}
                    oninput={Callback::from({
                        let password = password.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                password.set(input.value());
                            }
                        }
                    })}
                />
                <br />
                <button onclick={on_login}>{"Log In"}</button>

                if token.is_some() {
                    <p style="color: green;">{format!("Logged in. Token: {}", token.as_ref().unwrap())}</p>
                } else {
                    <p style="color: red;">{"Not logged in"}</p>
                }
            </div>

            // ---------- Category Section ----------
            <div style="border: 1px solid #ccc; padding: 0.5rem; margin-bottom: 1rem;">
                <h2>{"Categories"}</h2>
                <p>{"Refresh / See All Categories:"}</p>
                <button onclick={
                    let fetch_categories = fetch_categories.clone();
                    move |_| fetch_categories()
                }>
                    {"Refresh Categories"}
                </button>

                <ul>
                {
                    for categories.iter().map(|cat| html! {
                        <li>
                            {format!("ID: {:?}, Name: {}, Parent: {:?}", cat.id, cat.name, cat.parent_id)}
                        </li>
                    })
                }
                </ul>

                <hr />
                <h3>{"Create a new category"}</h3>
                <p>{"Category name:"}</p>
                <input
                    type="text"
                    value={(*category_name).clone()}
                    oninput={Callback::from({
                        let category_name = category_name.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                category_name.set(input.value());
                            }
                        }
                    })}
                />
                <p>{"Select Parent Category (optional):"}</p>
                <Autocomplete<Category>
                    items={(*categories).clone()}
                    placeholder={"Type parent category name...".to_string()}
                    get_label={Callback::from(|cat: Category| cat.name.clone())}
                    get_id={Callback::from(|cat: Category| cat.id.unwrap_or(0))}
                    on_select={Callback::from({
                        let parent_id_selected = parent_id_selected.clone();
                        move |(id, _name): (i32, String)| {
                            parent_id_selected.set(Some(id));
                        }
                    })}
                />
                <br /><br />
                <button onclick={on_create_category}>{"Create Category"}</button>
            </div>

            // ---------- Products Section ----------
            <div style="border: 1px solid #ccc; padding: 0.5rem; margin-bottom: 1rem;">
                <h2>{"Products"}</h2>
                <p>{"Refresh / See All Products:"}</p>
                <button onclick={
                    let fetch_products = fetch_products.clone();
                    move |_| fetch_products()
                }>
                    {"Refresh Products"}
                </button>

                <ul>
                {
                    for products.iter().map(|p| html! {
                        <li>
                            {format!("ID: {:?}, Name: {}, user_id: {}", p.id, p.name, p.user_id)}
                        </li>
                    })
                }
                </ul>

                <hr />
                <h3>{"Create a new product"}</h3>
                <p>{"Product name:"}</p>
                <input
                    type="text"
                    value={(*product_name).clone()}
                    oninput={Callback::from({
                        let product_name = product_name.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                product_name.set(input.value());
                            }
                        }
                    })}
                />
                <br />
                <button onclick={on_create_product}>{"Create Product"}</button>
            </div>

            // ---------- Product Prices Section ----------
            <div style="border: 1px solid #ccc; padding: 0.5rem; margin-bottom: 1rem;">
                <h2>{"Product Prices"}</h2>
                <p>{"Refresh / See All Prices:"}</p>
                <button onclick={
                    let fetch_product_prices = fetch_product_prices.clone();
                    move |_| fetch_product_prices()
                }>
                    {"Refresh Prices"}
                </button>

                <ul>
                {
                    for product_prices.iter().map(|pp| html! {
                        <li>
                            {format!(
                                "ID: {:?}, product_id: {}, price: {}, start_date: {}, end_date: {:?}",
                                pp.id, pp.product_id, pp.price, pp.start_date, pp.end_date
                            )}
                        </li>
                    })
                }
                </ul>

                <hr />
                <h3>{"Create a new product price"}</h3>
                <p>{"Select Product:"}</p>
                <Autocomplete<Product>
                    items={(*products).clone()}
                    placeholder={"Type product name...".to_string()}
                    get_label={Callback::from(|p: Product| p.name.clone())}
                    get_id={Callback::from(|p: Product| p.id.unwrap_or(0))}
                    on_select={Callback::from({
                        let pp_product_id = pp_product_id.clone();
                        move |(id, _name): (i32, String)| {
                            pp_product_id.set(Some(id));
                        }
                    })}
                />
                <p>{"Price (f64):"}</p>
                <input
                    type="text"
                    value={(*pp_price).clone()}
                    oninput={Callback::from({
                        let pp_price = pp_price.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                pp_price.set(input.value());
                            }
                        }
                    })}
                />
                <p>{"Start Date (YYYY-MM-DD):"}</p>
                <input
                    type="text"
                    value={(*pp_start_date).clone()}
                    oninput={Callback::from({
                        let pp_start_date = pp_start_date.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                pp_start_date.set(input.value());
                            }
                        }
                    })}
                />
                <br />
                <button onclick={on_create_product_price}>{"Create Product Price"}</button>
            </div>

            // ---------- Transactions Section ----------
            <div style="border: 1px solid #ccc; padding: 0.5rem;">
                <h2>{"Transactions"}</h2>
                <p>{"Refresh / See All Transactions:"}</p>
                <button onclick={
                    let fetch_transactions = fetch_transactions.clone();
                    move |_| fetch_transactions()
                }>
                    {"Refresh Transactions"}
                </button>

                <ul>
                {
                    for transactions.iter().map(|tx| html! {
                        <li>
                            {format!(
                                "ID: {:?}, user_id: {}, product_id: {:?}, category_id: {}, type: {}, amount: {}, desc: {}, date: {}",
                                tx.id, tx.user_id, tx.product_id, tx.category_id,
                                tx.transaction_type, tx.amount, tx.description, tx.date
                            )}
                        </li>
                    })
                }
                </ul>

                <hr />
                <h3>{"Create a new transaction"}</h3>
                <p>{"Transaction Type (expense/income/etc.):"}</p>
                <input
                    type="text"
                    value={(*tx_type).clone()}
                    oninput={Callback::from({
                        let tx_type = tx_type.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                tx_type.set(input.value());
                            }
                        }
                    })}
                />
                <p>{"Amount:"}</p>
                <input
                    type="text"
                    value={(*tx_amount).clone()}
                    oninput={Callback::from({
                        let tx_amount = tx_amount.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                tx_amount.set(input.value());
                            }
                        }
                    })}
                />
                <p>{"Description:"}</p>
                <input
                    type="text"
                    value={(*tx_description).clone()}
                    oninput={Callback::from({
                        let tx_description = tx_description.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                tx_description.set(input.value());
                            }
                        }
                    })}
                />
                <p>{"Date (YYYY-MM-DD):"}</p>
                <input
                    type="text"
                    value={(*tx_date).clone()}
                    oninput={Callback::from({
                        let tx_date = tx_date.clone();
                        move |e: InputEvent| {
                            if let Some(input) = e.target().and_then(|t| t.dyn_into::<web_sys::HtmlInputElement>().ok()) {
                                tx_date.set(input.value());
                            }
                        }
                    })}
                />

                <p>{"(Optional) Select Product by name:"}</p>
                <Autocomplete<Product>
                    items={(*products).clone()}
                    placeholder={"Type product name...".to_string()}
                    get_label={Callback::from(|p: Product| p.name.clone())}
                    get_id={Callback::from(|p: Product| p.id.unwrap_or(0))}
                    on_select={Callback::from({
                        let tx_product_id = tx_product_id.clone();
                        move |(id, _name): (i32, String)| {
                            tx_product_id.set(Some(id));
                        }
                    })}
                />

                <p>{"Select Category by name (required):"}</p>
                <Autocomplete<Category>
                    items={(*categories).clone()}
                    placeholder={"Type category name...".to_string()}
                    get_label={Callback::from(|c: Category| c.name.clone())}
                    get_id={Callback::from(|c: Category| c.id.unwrap_or(0))}
                    on_select={Callback::from({
                        let tx_category_id = tx_category_id.clone();
                        move |(id, _name): (i32, String)| {
                            tx_category_id.set(Some(id));
                        }
                    })}
                />
                <br />
                <button onclick={on_create_transaction}>{"Create Transaction"}</button>
            </div>
        </div>
    }
}

// ==================== main() entry point ====================

fn main() {
    yew::Renderer::<App>::new().render();
}
