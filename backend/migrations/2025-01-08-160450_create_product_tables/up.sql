-- Your SQL goes here
-- We'll assume there's already a 'users' table and 'categories' table
-- that each reference user_id. Now, create three new tables: products, product_prices, transactions.

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE (user_id, name)
);

CREATE TABLE product_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    price INTEGER NOT NULL,         -- store as an integer (cents) to avoid float issues
    created_at TIMESTAMP NOT NULL,  -- PostgreSQL has a native TIMESTAMP type
    FOREIGN KEY (product_id) REFERENCES products (id)
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,    -- optional if some transactions are not tied to a specific product
    category_id INTEGER,            -- optional if you want a category
    transaction_type TEXT NOT NULL, -- "in" or "out"
    description TEXT,
    date TIMESTAMP NOT NULL,        -- PostgreSQL TIMESTAMP instead of TEXT
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (category_id) REFERENCES categories (id)
);
