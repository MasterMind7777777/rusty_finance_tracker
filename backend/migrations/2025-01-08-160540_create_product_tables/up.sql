-- Your SQL goes here
-- We'll assume there's already a 'users' table and 'categories' table
-- that each reference user_id. Now, create three new tables: products, product_prices, transactions.

CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
    UNIQUE (user_id, name)
);

CREATE TABLE product_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    price INTEGER NOT NULL,         -- store as an integer (cents) to avoid float issues
    created_at TEXT NOT NULL,       -- store timestamp or ISO8601 date/time
    FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER,             -- optional if some transactions are not tied to a specific product
    category_id INTEGER,            -- optional if you want a category
    transaction_type TEXT NOT NULL, -- "in" or "out"
    amount INTEGER NOT NULL,        -- in cents
    description TEXT,
    date TEXT NOT NULL,             -- e.g. ISO8601
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (category_id) REFERENCES categories (id)
);
