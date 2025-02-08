use diesel::pg::PgConnection;
use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};

// This is a type alias for our connection pool
pub type PgPool = Pool<ConnectionManager<PgConnection>>;

// And a type alias for an individual connection from the pool
pub type DbConn = PooledConnection<ConnectionManager<PgConnection>>;

/// Initialize an R2D2-based connection pool for Postgres.
pub fn init_pool(database_url: &str) -> PgPool {
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    Pool::builder()
        .build(manager)
        .expect("Failed to create DB pool")
}
