use std::path::{Path, PathBuf};

use futures_util::StreamExt;
use serde::Serialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, Manager};
use tokio::io::AsyncWriteExt;

use crate::error::{Code, Result};

#[derive(Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Kind {
    Whisper,
    Llm,
}

pub struct ModelInfo {
    pub id: &'static str,
    pub kind: Kind,
    pub name: &'static str,
    file: &'static str,
    url: &'static str,
    sha256: &'static str,
    size: u64,
    recommended: bool,
}

// Hash and size taken from Hugging Face. Any other file is rejected.
pub const CATALOG: &[ModelInfo] = &[
    ModelInfo {
        id: "whisper-small",
        kind: Kind::Whisper,
        name: "Whisper small",
        file: "ggml-small.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
        sha256: "1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b",
        size: 487_601_967,
        recommended: true,
    },
    ModelInfo {
        id: "whisper-base",
        kind: Kind::Whisper,
        name: "Whisper base",
        file: "ggml-base.bin",
        url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
        sha256: "60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe",
        size: 147_951_465,
        recommended: false,
    },
    ModelInfo {
        id: "qwen2.5-1.5b",
        kind: Kind::Llm,
        name: "Qwen 2.5 1.5B",
        file: "qwen2.5-1.5b-instruct-q4_k_m.gguf",
        url: "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf",
        sha256: "6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e",
        size: 1_117_320_736,
        recommended: false,
    },
    ModelInfo {
        id: "qwen2.5-3b",
        kind: Kind::Llm,
        name: "Qwen 2.5 3B",
        file: "qwen2.5-3b-instruct-q4_k_m.gguf",
        url: "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF/resolve/main/qwen2.5-3b-instruct-q4_k_m.gguf",
        sha256: "626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d",
        size: 2_104_932_768,
        recommended: true,
    },
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    id: &'static str,
    kind: Kind,
    name: &'static str,
    size: u64,
    recommended: bool,
    installed: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct Progress {
    id: &'static str,
    downloaded: u64,
    total: u64,
}

pub fn dir(app: &AppHandle) -> Result<PathBuf> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|_| Code::AppFolderMissing)?;
    Ok(base.join("models"))
}

fn find(id: &str) -> Result<&'static ModelInfo> {
    Ok(CATALOG
        .iter()
        .find(|m| m.id == id)
        .ok_or(Code::UnknownModel)?)
}

// Only one model per kind on disk: whichever is there gets used.
pub fn installed(
    app: &AppHandle,
    kind: Kind,
) -> Result<Option<(&'static ModelInfo, PathBuf)>> {
    let dir = dir(app)?;
    Ok(CATALOG
        .iter()
        .filter(|m| m.kind == kind)
        .map(|m| (m, dir.join(m.file)))
        .find(|(_, path)| path.exists()))
}

#[tauri::command]
pub fn models_status(app: AppHandle) -> Result<Vec<ModelStatus>> {
    let dir = dir(&app)?;
    Ok(CATALOG
        .iter()
        .map(|m| ModelStatus {
            id: m.id,
            kind: m.kind,
            name: m.name,
            size: m.size,
            recommended: m.recommended,
            installed: dir.join(m.file).exists(),
        })
        .collect())
}

#[tauri::command]
pub async fn model_download(
    app: AppHandle,
    engines: tauri::State<'_, super::Engines>,
    http: tauri::State<'_, reqwest::Client>,
    id: String,
) -> Result<()> {
    let model = find(&id)?;
    let dir = dir(&app)?;
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|_| Code::ModelSaveFailed)?;

    // Downloads to .part: a cut halfway never leaves a broken model.
    let part = dir.join(format!("{}.part", model.file));
    let result = fetch(&app, &http, model, &part).await;
    if result.is_err() {
        let _ = tokio::fs::remove_file(&part).await;
    }
    result?;

    engines.unload(model.kind);
    for other in CATALOG
        .iter()
        .filter(|m| m.kind == model.kind && m.id != model.id)
    {
        let _ = tokio::fs::remove_file(dir.join(other.file)).await;
    }
    Ok(tokio::fs::rename(&part, dir.join(model.file))
        .await
        .map_err(|_| Code::ModelSaveFailed)?)
}

async fn fetch(
    app: &AppHandle,
    http: &reqwest::Client,
    model: &'static ModelInfo,
    part: &Path,
) -> Result<()> {
    let response = http
        .get(model.url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|_| Code::DownloadFailed)?;

    let mut file = tokio::fs::File::create(part)
        .await
        .map_err(|_| Code::ModelSaveFailed)?;
    let mut hasher = Sha256::new();
    let mut downloaded = 0u64;
    let mut last_emit = 0u64;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| Code::DownloadFailed)?;
        hasher.update(&chunk);
        file.write_all(&chunk)
            .await
            .map_err(|_| Code::DiskFull)?;
        downloaded += chunk.len() as u64;
        // One event per ~1%: more floods the IPC.
        if downloaded - last_emit >= model.size / 100 || downloaded == model.size {
            last_emit = downloaded;
            let _ = app.emit(
                "models://progress",
                Progress {
                    id: model.id,
                    downloaded,
                    total: model.size,
                },
            );
        }
    }
    file.flush().await.map_err(|_| Code::ModelSaveFailed)?;

    let hash: String = hasher
        .finalize()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect();
    if hash != model.sha256 {
        return Err(Code::DownloadCorrupt.into());
    }
    Ok(())
}

#[tauri::command]
pub fn model_delete(
    app: AppHandle,
    engines: tauri::State<'_, super::Engines>,
    id: String,
) -> Result<()> {
    let model = find(&id)?;
    engines.unload(model.kind);
    let path = dir(&app)?.join(model.file);
    if path.exists() {
        std::fs::remove_file(path).map_err(|_| Code::ModelDeleteFailed)?;
    }
    Ok(())
}
