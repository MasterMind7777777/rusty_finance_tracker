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

-- 2) Product prices remain the same
CREATE TABLE product_prices (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    price INTEGER NOT NULL,         -- store as an integer (cents) to avoid float issues
    created_at TIMESTAMP NOT NULL,  -- PostgreSQL has a native TIMESTAMP type
    FOREIGN KEY (product_id) REFERENCES products (id)
);

-- 3) Transactions table without the 'category_id' column.
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,    -- if a transaction must always tie to a product
    transaction_type TEXT NOT NULL, -- e.g. "in" or "out"
    description TEXT,
    date TIMESTAMP NOT NULL,        -- PostgreSQL TIMESTAMP
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (product_id) REFERENCES products (id)
);
