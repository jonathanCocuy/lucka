// Las mismas de tauri.macos.conf.json (frameworks).
const MAC_LIBS: &[&str] = &[
    "libggml.0.dylib",
    "libggml-base.0.dylib",
    "libggml-cpu.0.dylib",
    "libggml-metal.0.dylib",
    "libllama.0.dylib",
    "libllama-common.0.dylib",
];

fn main() {
    // tauri-build exige que `libs` y sus frameworks existan al compilar, pero las
    // librerías reales llegan después, antes de empaquetar (scripts/stage-native-libs.mjs).
    // Mientras tanto van archivos vacíos.
    std::fs::create_dir_all("libs").expect("no se pudo crear src-tauri/libs");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("macos") {
        // llama.cpp va como .dylib: en dev está junto al binario, en la .app en Frameworks.
        println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path");
        println!("cargo:rustc-link-arg=-Wl,-rpath,@executable_path/../Frameworks");
        for lib in MAC_LIBS {
            let path = std::path::Path::new("libs").join(lib);
            if !path.exists() {
                std::fs::write(&path, []).expect("no se pudo crear el reemplazo");
            }
        }
    }
    tauri_build::build()
}
