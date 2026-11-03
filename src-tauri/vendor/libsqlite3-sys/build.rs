use std::env;
use std::fs;
use std::path::PathBuf;

fn main() {
    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    fs::copy("sqlite3/bindgen_bundled_version.rs", out_dir.join("bindgen.rs"))
        .expect("copy SQLite bindings");
    println!("cargo:rerun-if-changed=sqlite3/bindgen_bundled_version.rs");
    println!("cargo:rerun-if-changed=sqlcipher_native.h");
    println!("cargo:rerun-if-changed=sqlcipher_rng.c");

    let source_dir = sqlcipher_src::source_dir();
    let config = format!("{}/sqlcipher_native.h", env!("CARGO_MANIFEST_DIR"));
    println!("cargo:rerun-if-changed={}", source_dir.display());

    let mut sqlcipher = cc::Build::new();
    sqlcipher
        .file(source_dir.join(sqlcipher_src::SOURCE_FILE))
        .include(source_dir)
        .include(source_dir.join(sqlcipher_src::LIBTOMCRYPT_INCLUDE_DIR))
        .flag(&format!("/FI{}", config))
        .flag("-DSQLITE_CORE")
        .flag("-DSQLITE_HAS_CODEC")
        .flag("-DSQLCIPHER_CRYPTO_LIBTOMCRYPT")
        .flag("-DSQLITE_EXTRA_INIT=sqlcipher_extra_init")
        .flag("-DSQLITE_EXTRA_SHUTDOWN=sqlcipher_extra_shutdown")
        .flag("-DSQLITE_TEMP_STORE=2")
        .flag("-DSQLITE_DEFAULT_FOREIGN_KEYS=1")
        .flag("-DSQLITE_ENABLE_API_ARMOR")
        .flag("-DSQLITE_ENABLE_COLUMN_METADATA")
        .flag("-DSQLITE_ENABLE_DBSTAT_VTAB")
        .flag("-DSQLITE_ENABLE_FTS3")
        .flag("-DSQLITE_ENABLE_FTS3_PARENTHESIS")
        .flag("-DSQLITE_ENABLE_FTS5")
        .flag("-DSQLITE_ENABLE_JSON1")
        .flag("-DSQLITE_ENABLE_LOAD_EXTENSION=1")
        .flag("-DSQLITE_ENABLE_MEMORY_MANAGEMENT")
        .flag("-DSQLITE_ENABLE_RTREE")
        .flag("-DSQLITE_ENABLE_STAT4")
        .flag("-DSQLITE_SOUNDEX")
        .flag("-DSQLITE_THREADSAFE=1")
        .flag("-DSQLITE_USE_URI")
        .flag("-DHAVE_USLEEP=1")
        .flag("-DHAVE_ISNAN")
        .warnings(false)
        .compile("sqlite3");

    let mut libtomcrypt = cc::Build::new();
    libtomcrypt
        .include(source_dir.join(sqlcipher_src::LIBTOMCRYPT_INCLUDE_DIR))
        .flag(&format!("/FI{}", config))
        .define("LTC_SOURCE", None)
        .files(
            sqlcipher_src::LIBTOMCRYPT_SOURCES
                .iter()
                .filter(|source| !source.ends_with("rng_get_bytes.c"))
                .map(|source| source_dir.join(source)),
        )
        .file("sqlcipher_rng.c")
        .warnings(false)
        .compile("sqlcipher_ltc");

    println!("cargo:rustc-link-lib=bcrypt");
}
