# Vendored Rust dependencies

## libsqlite3-sys 0.30.1 (SQLCipher/libtomcrypt build)

`libsqlite3-sys` is vendored to compile the bundled `sqlcipher-src` amalgamation with the
libtomcrypt crypto provider. This avoids a system OpenSSL, Perl or NASM dependency on Windows while
still exposing the standard SQLite API to `rusqlite`.

Files changed from the crates.io release:

- `build.rs` compiles SQLCipher and libtomcrypt, copies the bundled SQLite bindings into `OUT_DIR`,
  and links `bcrypt` for Windows entropy.
- `sqlcipher_native.h` is the shared libtomcrypt configuration used by SQLCipher and every
  libtomcrypt translation unit.
- `sqlcipher_rng.c` implements `rng_get_bytes` with `BCryptGenRandom` instead of libtomcrypt's
  platform entropy probes.
- The large upstream SQLite C sources are removed; only the generated bindings remain.

When upgrading `libsqlite3-sys` or `rusqlite`:

1. Keep `libsqlite3-sys` at the version required by the selected `rusqlite` release.
2. Reapply the build-script, header and RNG changes against the new crate.
3. Verify `PRAGMA cipher_version`, `PRAGMA key`, plaintext export and encrypted reopen.
4. Re-run `cargo test`, the encrypted migration and backup/restore smoke tests.
