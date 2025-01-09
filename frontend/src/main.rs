use gloo_net::http::Request;
use serde::{Deserialize, Serialize};
use yew::prelude::*;

// ==================== Models (matching backend) ====================

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
pub struct NewCategory {
    pub name: String,
    pub parent_id: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Category {
    pub id: Option<i32>,
    pub name: String,
    pub parent_id: Option<i32>,
}

// ==================== App Component ====================

#[function_component(App)]
fn app() -> Html {
    // --- State ---
    let backend_url = use_state(|| "http://127.0.0.1:3000".to_string());

    let token = use_state(|| None::<String>); // store JWT token
    let categories = use_state(Vec::<Category>::new);

    let email = use_state(|| "".to_string());
    let password = use_state(|| "".to_string());

    let category_name = use_state(|| "".to_string());
    let parent_id = use_state(|| "".to_string()); // for subcategory

    // --- Handlers ---

    // 1) LOGIN
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

                // POST /login
                let resp = Request::post(&format!("{}/login", backend_url))
                    .header("Content-Type", "application/json")
                    .body(serde_json::to_string(&login_req).unwrap())
                    .expect("Failed to build request")
                    .send()
                    .await;

                match resp {
                    Ok(response) => {
                        if response.status() == 200 {
                            if let Ok(json) = response.json::<TokenResponse>().await {
                                // Store the token
                                token.set(Some(json.token));
                            } else {
                                web_sys::console::log_1(&"Failed to parse token".into());
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

    // 2) CREATE CATEGORY
    let on_create_category = {
        let token = token.clone();
        let category_name = category_name.clone();
        let parent_id = parent_id.clone();
        let backend_url = backend_url.clone();
        let categories = categories.clone();

        Callback::from(move |e: MouseEvent| {
            e.prevent_default();

            let token = token.clone();
            let category_name = category_name.clone();
            let parent_id = parent_id.clone();
            let backend_url = (*backend_url).clone();
            let categories = categories.clone();

            if token.is_none() {
                web_sys::console::log_1(&"No token, please log in first.".into());
                return;
            }

            wasm_bindgen_futures::spawn_local(async move {
                let new_cat = NewCategory {
                    name: (*category_name).clone(),
                    parent_id: match (*parent_id).trim() {
                        "" => None,
                        s => s.parse::<i32>().ok(),
                    },
                };

                let resp = Request::post(&format!("{}/categories", backend_url))
                    .header("Content-Type", "application/json")
                    .header(
                        "Authorization",
                        &format!("Bearer {}", token.as_ref().unwrap()),
                    )
                    .body(serde_json::to_string(&new_cat).unwrap())
                    .expect("Failed to build request")
                    .send()
                    .await;

                match resp {
                    Ok(response) => {
                        if response.status() == 200 {
                            let text = response.text().await.unwrap_or_default();
                            web_sys::console::log_1(
                                &format!("Category creation result: {}", text).into(),
                            );
                            // After creation, maybe fetch categories to refresh
                            fetch_categories(
                                backend_url,
                                token.as_ref().unwrap().clone(),
                                categories,
                            )
                            .await;
                        } else {
                            let text = response.text().await.unwrap_or_default();
                            web_sys::console::log_1(&format!("Error: {}", text).into());
                        }
                    }
                    Err(err) => {
                        web_sys::console::log_1(&format!("Request failed: {}", err).into());
                    }
                }
            });
        })
    };

    // 3) LIST CATEGORIES
    let on_list_categories = {
        let token = token.clone();
        let backend_url = backend_url.clone();
        let categories = categories.clone();

        Callback::from(move |e: MouseEvent| {
            e.prevent_default();

            if token.is_none() {
                web_sys::console::log_1(&"No token, please log in first.".into());
                return;
            }

            let t = token.as_ref().unwrap().clone();
            let backend_url = (*backend_url).clone();
            let categories = categories.clone();

            wasm_bindgen_futures::spawn_local(async move {
                fetch_categories(backend_url, t, categories).await;
            });
        })
    };

    // Helper function to fetch categories from server
    fn get_categories_req(url: &str, token: &str) -> Request {
        Request::get(url)
            .header("Authorization", &format!("Bearer {}", token))
            .build()
            .unwrap()
    }

    async fn fetch_categories(
        backend_url: String,
        token: String,
        state: UseStateHandle<Vec<Category>>,
    ) {
        let resp = get_categories_req(&format!("{}/categories", backend_url), &token)
            .send()
            .await;

        match resp {
            Ok(response) => {
                if response.status() == 200 {
                    match response.json::<Vec<Category>>().await {
                        Ok(cats) => {
                            state.set(cats);
                        }
                        Err(e) => {
                            web_sys::console::log_1(&format!("JSON parse error: {}", e).into());
                        }
                    }
                } else {
                    let text = response.text().await.unwrap_or_default();
                    web_sys::console::log_1(&format!("Error: {}", text).into());
                }
            }
            Err(err) => {
                web_sys::console::log_1(&format!("Request error: {}", err).into());
            }
        }
    }

    // --- UI ---

    html! {
        <div style="padding: 1rem; font-family: sans-serif; max-width: 600px;">
            <h1>{ "Finance Tracker Frontend" }</h1>

            <div style="border: 1px solid #ccc; padding: 0.5rem; margin-bottom: 1rem;">
                <h2>{"Login"}</h2>
                <input
                    type="text"
                    placeholder="Email"
                    value={(*email).clone()}
                    oninput={Callback::from(move |e: InputEvent| {
                        let input: web_sys::HtmlInputElement = e.target_unchecked_into();
                        email.set(input.value());
                    })}
                />
                <br />
                <input
                    type="password"
                    placeholder="Password"
                    value={(*password).clone()}
                    oninput={Callback::from(move |e: InputEvent| {
                        let input: web_sys::HtmlInputElement = e.target_unchecked_into();
                        password.set(input.value());
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

            <div style="border: 1px solid #ccc; padding: 0.5rem; margin-bottom: 1rem;">
                <h2>{"Create Category"}</h2>
                <input
                    type="text"
                    placeholder="Category name"
                    value={(*category_name).clone()}
                    oninput={Callback::from(move |e: InputEvent| {
                        let input: web_sys::HtmlInputElement = e.target_unchecked_into();
                        category_name.set(input.value());
                    })}
                />
                <br />
                <input
                    type="text"
                    placeholder="Parent ID (optional)"
                    value={(*parent_id).clone()}
                    oninput={Callback::from(move |e: InputEvent| {
                        let input: web_sys::HtmlInputElement = e.target_unchecked_into();
                        parent_id.set(input.value());
                    })}
                />
                <br />
                <button onclick={on_create_category}>{"Create Category"}</button>
            </div>

            <div style="border: 1px solid #ccc; padding: 0.5rem;">
                <h2>{"List Categories"}</h2>
                <button onclick={on_list_categories}>{"Refresh Categories"}</button>
                <ul>
                {
                    for categories.iter().map(|cat| html! {
                        <li>
                            {format!("ID: {:?}, Name: {}, Parent: {:?}", cat.id, cat.name, cat.parent_id)}
                        </li>
                    })
                }
                </ul>
            </div>
        </div>
    }
}

// ==================== main() entry point ====================

fn main() {
    yew::Renderer::<App>::new().render();
}
