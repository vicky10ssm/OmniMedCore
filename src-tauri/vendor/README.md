# Vendored Rust dependencies

## tauri-plugin-sql 2.6.0

The upstream crate is vendored only to change the SQLite pool from the SQLx default to
`max_connections(1)` in `src/wrapper.rs`.

MediCore's existing transaction callbacks issue `BEGIN IMMEDIATE`, multiple awaited statements and
`COMMIT` through separate plugin calls. With more than one pooled SQLite connection those statements
could be assigned to different connections, breaking transaction atomicity. A single connection keeps
every statement inside the transaction on the same connection.

When upgrading `tauri-plugin-sql`:

1. Download the new crate source.
2. Reapply the `max_connections(1)` change.
3. Update `src-tauri/Cargo.toml` and the `@tauri-apps/plugin-sql` npm version together.
4. Test transaction-heavy flows: invoice creation/payment/cancellation, pharmacy dispensing, sample
   transitions, report save/verify and demo seeding.
