mod ai;
mod voice;

use std::time::Duration;

use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

// Misma URL que src/lib/local-db/db.ts. Las migraciones corren al abrirla.
const DB_URL: &str = "sqlite:lucka.db";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "init",
            sql: include_str!("../migrations/0001_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "ai_providers",
            sql: include_str!("../migrations/0002_ai_providers.sql"),
            kind: MigrationKind::Up,
        },
    ];

    // Sin timeout global: bajar un modelo de 2 GB tarda. Solo el de conexión.
    let http = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .build()
        .expect("error creando el cliente HTTP");

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations(DB_URL, migrations)
                .build(),
        )
        .manage(http)
        .manage(voice::Engines::default())
        .manage(voice::recorder::Recorder::default())
        .invoke_handler(tauri::generate_handler![
            voice::models::models_status,
            voice::models::model_download,
            voice::models::model_delete,
            voice::voice_start,
            voice::voice_stop,
            voice::voice_check_mic,
            ai::ai_save_key,
            ai::ai_delete_key,
            ai::ai_interpret,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                app.state::<voice::Engines>().unload_all();
            }
        });
}
