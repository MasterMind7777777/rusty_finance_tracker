CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    parent_category_id INTEGER,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (parent_category_id) REFERENCES categories (id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE (user_id, name)
);
