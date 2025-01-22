-- We'll assume there's already a 'users' table and 'categories' table
-- that each reference user_id. Now, we create or recreate:

-- 1) Products table with a new optional 'category_id' reference.
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    category_id INTEGER,           -- optional link to categories
    name TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (category_id) REFERENCES categories (id),
    UNIQUE (user_id, name)
);

-- 2) Product prices table, now with a UNIQUE constraint on (product_id, price, created_at)
CREATE TABLE product_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    price INTEGER NOT NULL,         -- store as an integer (cents)
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products (id),
    UNIQUE (product_id, price, created_at)
);

-- 3) Transactions table - now includes product_price_id
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_price_id INTEGER NOT NULL,               -- <--- NEW COLUMN
    transaction_type TEXT NOT NULL,         -- e.g., "income" or "expense"
    description TEXT,
    date TIMESTAMP NOT NULL,                -- Postgres TIMESTAMP
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (product_price_id) REFERENCES product_prices (id),
    UNIQUE (user_id, product_id, date, transaction_type)
);
