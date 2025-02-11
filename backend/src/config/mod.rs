use dotenvy::dotenv;
use std::env;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub address: String, // or store host + port separately if you prefer
}

impl AppConfig {
    /// Load configuration from environment variables.
    /// Fails if `DATABASE_URL` is missing, etc.
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        // Load variables from .env file (if present).
        dotenv().ok();

        // Read from environment
        let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

        // Optionally allow an address override
        // or default to "127.0.0.1:3000"
        let address = env::var("SERVER_ADDRESS").unwrap_or_else(|_| "127.0.0.1:8000".to_string());

        Ok(Self {
            database_url,
            address,
        })
    }
}
