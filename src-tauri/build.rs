// Same list as tauri.macos.conf.json (frameworks).
const MAC_LIBS: &[&str] = &[
    "libggml.0.dylib",
    "libggml-base.0.dylib",
    "libggml-cpu.0.dylib",
    "libggml-metal.0.dylib",
    "libllama.0.dylib",
    "libllama-common.0.dylib",
];

fn main() {
    // tauri-build requires `libs` and its frameworks to exist at compile time, but the
    // real libraries arrive later, right before bundling (scripts/stage-native-libs.mjs).
    // Until then, empty placeholders stand in.
    std::fs::create_dir_all("libs").expect("could not create src-tauri/libs");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        // llama.cpp ships as a .dylib: next to the binary in dev, in Frameworks inside the .app.
        println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path");
        println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Frameworks");
        for lib in MAC_LIBS {
            let path = std::path::Path::new("libs").join(lib);
            if !path.exists() {
                std::fs::write(&path, []).expect("could not create the placeholder");
            }
        }
    }
    tauri_build::build()
}
