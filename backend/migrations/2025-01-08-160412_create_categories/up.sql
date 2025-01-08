-- Your SQL goes here
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_category_id INTEGER,
    name TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    FOREIGN KEY (parent_category_id) REFERENCES categories (id)
    FOREIGN KEY (user_id) REFERENCES users(id)
);
