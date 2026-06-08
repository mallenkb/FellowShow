fn main() {
    // Re-run (and re-bake the option_env! content URLs) when these change at build time.
    println!("cargo:rerun-if-env-changed=FELLOWSHOW_CONTENT_BASE_URL");
    println!("cargo:rerun-if-env-changed=FELLOWSHOW_CONTENT_MANIFEST_URL");
    tauri_build::build();
}
