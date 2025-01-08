// tests/workflow_test.rs

use diesel::Connection;
use std::{env, sync::Arc};

use reqwest::Client;
use tokio::net::TcpListener;

use crate::{main_router, AppState};
// ^ Make sure `main_router` and `AppState` are public in your src/lib.rs or src/main.rs
//   If they're private, Rust won't let your tests import them.

use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use tempfile::NamedTempFile;

// 1. Embed your migrations
pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

/// 2. A helper to run migrations on the open connection
pub fn run_migrations(conn: &mut SqliteConnection) {
    conn.run_pending_migrations(MIGRATIONS)
        .expect("Failed to run migrations");
}

/// 3. We'll spawn the test server on an ephemeral port with an in-memory DB
async fn spawn_app() -> (String, Client, NamedTempFile) {
    // Create a temporary file for the database
    let db_file = NamedTempFile::new().expect("Failed to create temp file");
    let db_path = db_file.path().to_str().unwrap().to_string();
    env::set_var("DATABASE_URL", &db_path);

    // Build shared state
    let shared_state = AppState {
        db_url: env::var("DATABASE_URL").unwrap(),
    };

    // Establish a brand new empty DB connection
    let mut conn =
        SqliteConnection::establish(&shared_state.db_url).expect("Failed to create in-memory DB");

    // Run migrations on that DB
    run_migrations(&mut conn);

    // Then build + spawn the actual Axum server
    let app = main_router(Arc::new(shared_state));

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();

    tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let base_url = format!("http://{}", addr);
    (base_url, Client::new(), db_file)
}

/// 4. The integration test that exercises the entire workflow
#[tokio::test]
async fn test_full_workflow() {
    let (base_url, client, _db_file) = spawn_app().await;

    // 1. Sign up user
    let resp = client
        .post(format!("{}/users", base_url))
        .json(&serde_json::json!({
            "email": "alice@example.com",
            "password_hash": "secret123"
        }))
        .send()
        .await
        .expect("Failed to sign up user");
    assert!(resp.status().is_success());
    let text = resp.text().await.unwrap();
    assert_eq!(text, "User signed up");

    // 2. Try same email -> expect duplicate error
    let resp = client
        .post(format!("{}/users", base_url))
        .json(&serde_json::json!({
            "email": "alice@example.com",
            "password_hash": "secret123"
        }))
        .send()
        .await
        .expect("Failed to sign up user again");
    assert!(resp.status().is_success());
    let text = resp.text().await.unwrap();
    assert_eq!(text, "A user with that email already exists");

    // 3. Login -> now we expect a JSON string like: `{"token":"<JWT>"}`
    let resp = client
        .post(format!("{}/login", base_url))
        .json(&serde_json::json!({
            "email": "alice@example.com",
            "password_hash": "secret123"
        }))
        .send()
        .await
        .expect("Failed to login");
    assert!(resp.status().is_success());

    // Parse the JSON body to get the token
    #[derive(serde::Deserialize)]
    struct TokenResponse {
        token: String,
    }
    let token_body: TokenResponse = resp.json().await.unwrap();
    let token = token_body.token;

    // 4. Create "Groceries" -> must include bearer auth header
    let resp = client
        .post(format!("{}/categories", base_url))
        .bearer_auth(&token) // <--- set the token
        .json(&serde_json::json!({
            "user_id": 1,
            "parent_category_id": null,
            "name": "Groceries"
        }))
        .send()
        .await
        .expect("Failed to create category");
    assert!(resp.status().is_success());
    let text = resp.text().await.unwrap();
    assert_eq!(text, "Category created");

    // 5. Create "Dairy" under Groceries -> again, set bearer auth
    let resp = client
        .post(format!("{}/categories", base_url))
        .bearer_auth(&token)
        .json(&serde_json::json!({
            "user_id": 1,
            "parent_category_id": 1,
            "name": "Dairy"
        }))
        .send()
        .await
        .expect("Failed to create subcategory");
    assert!(resp.status().is_success());
    let text = resp.text().await.unwrap();
    assert_eq!(text, "Category created");

    // 6. Create product "Milk"
    let resp = client
        .post(format!("{}/products", base_url))
        .bearer_auth(&token)
        .json(&serde_json::json!({
            "user_id": 1,
            "name": "Milk"
        }))
        .send()
        .await
        .expect("Failed to create product");
    assert!(resp.status().is_success());
    let text = resp.text().await.unwrap();
    assert_eq!(text, "Product created");

    // 7. Insert price
    let resp = client
        .post(format!("{}/product_prices", base_url))
        .bearer_auth(&token)
        .json(&serde_json::json!({
            "product_id": 1,
            "price": 299,
            "created_at": "2025-01-08T12:00:00Z"
        }))
        .send()
        .await
        .expect("Failed to create product price");
    assert!(resp.status().is_success());
    let text = resp.text().await.unwrap();
    assert_eq!(text, "Product price created");

    // 8. Create transaction
    let resp = client
        .post(format!("{}/transactions", base_url))
        .bearer_auth(&token)
        .json(&serde_json::json!({
            "user_id": 1,
            "product_id": 1,
            "category_id": 2,
            "transaction_type": "out",
            "amount": 299,
            "description": "Bought milk at the store",
            "date": "2025-01-08"
        }))
        .send()
        .await
        .expect("Failed to create transaction");
    assert!(resp.status().is_success());
    let text = resp.text().await.unwrap();
    assert_eq!(text, "Transaction created");

    // 9. Fetch transactions
    let resp = client
        .get(format!("{}/transactions", base_url))
        .bearer_auth(&token)
        .send()
        .await
        .expect("Failed to get transactions");
    assert!(resp.status().is_success());

    let tx_list = resp.json::<serde_json::Value>().await.unwrap();
    assert_eq!(
        tx_list,
        serde_json::json!([
            {
                "id": 1,
                "user_id": 1,
                "product_id": 1,
                "category_id": 2,
                "transaction_type": "out",
                "amount": 299,
                "description": "Bought milk at the store",
                "date": "2025-01-08"
            }
        ])
    );

    println!("Workflow test passed!");
}
