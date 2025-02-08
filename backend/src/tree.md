src
├── bin
│ └── main.rs // Minimal startup code.
├── config
│ ├── mod.rs // AppConfig and environment loading.
├── db
│ ├── mod.rs // Connection handling, migrations (if needed).
├── domain
│ ├── users
│ │ ├── mod.rs // Aggregates user-specific types and logic
│ │ ├── handlers.rs // Axum handlers or service logic
│ │ ├── services.rs // Domain/business logic
│ │ └── models.rs // Diesel models (optional to keep them separate)
│ ├── categories
│ │ ├── ...
│ ├── products
│ │ ├── ...
│ ├── transactions
│ │ ├── ...
│ └── tags
│ ├── ...
├── routes
│ ├── mod.rs // Aggregates sub-routers
│ ├── user_routes.rs
│ ├── category_routes.rs
│ ├── product_routes.rs
│ ├── transaction_routes.rs
│ └── tag_routes.rs
├── schema.rs // Diesel schema (generated)
├── auth.rs // Authentication logic (JWT, middlewares)
├── lib.rs // `main_router` + shared library code (if needed)
└── tests
├── mod.rs
└── workflow_test.rs
