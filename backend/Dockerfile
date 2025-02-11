# 1) Builder Stage
FROM rust:1.83 AS builder
WORKDIR /app

# (A) Install system dependencies needed to build Diesel CLI
RUN apt-get update && apt-get install -y libpq-dev

# (B) Install Diesel CLI (match Diesel major version to your crate)
RUN cargo install diesel_cli --no-default-features --features postgres

# (C) Copy and build your app
COPY . .
RUN cargo build --release

# 2) Final Stage
FROM rust:1.83-slim
WORKDIR /app

# (D) Install runtime dependencies (Postgres library)
RUN apt-get update && apt-get install -y libpq5 && rm -rf /var/lib/apt/lists/*

# (E) Copy the Diesel binary from builder
COPY --from=builder /usr/local/cargo/bin/diesel /usr/local/bin/diesel
# (F) Copy the compiled backend binary
COPY --from=builder /app/target/release/backend .

# (G) Copy migrations folder (so diesel_cli can see it)
COPY ./migrations ./migrations

# (H) Default command just runs the app
CMD ["./backend"]
