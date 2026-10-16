fn main() {
    // llama.cpp va como .dylib: en dev está junto al binario, en la .app en Frameworks.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path");
        println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Frameworks");
    }
    // tauri-build exige que `libs` exista al compilar; se llena después,
    // antes de empaquetar (scripts/stage-native-libs.mjs).
    std::fs::create_dir_all("libs").expect("no se pudo crear src-tauri/libs");
    tauri_build::build()
}
