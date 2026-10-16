pub mod models;
pub mod recorder;

use std::path::PathBuf;
use std::sync::Mutex;

use tauri::AppHandle;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

use crate::ai::local::LocalLlm;
use models::Kind;
use recorder::{RATE, Recorder};

// Medio segundo: menos que eso es un clic sin querer.
const MIN_SAMPLES: usize = RATE as usize / 2;

// Modelos cargados en memoria. Cargar Whisper o el LLM tarda segundos: se reusan.
#[derive(Default)]
pub struct Engines {
    whisper: Mutex<Option<(PathBuf, WhisperContext)>>,
    pub llm: Mutex<Option<LocalLlm>>,
}

impl Engines {
    pub fn unload(&self, kind: Kind) {
        match kind {
            Kind::Whisper => drop(self.whisper.lock().map(|mut w| w.take())),
            Kind::Llm => drop(self.llm.lock().map(|mut l| l.take())),
        }
    }

    // ggml aborta si el proceso sale con modelos de Metal vivos.
    pub fn unload_all(&self) {
        self.unload(Kind::Whisper);
        self.unload(Kind::Llm);
    }
}

#[tauri::command]
pub fn voice_start(recorder: tauri::State<'_, Recorder>) -> Result<(), String> {
    recorder.start()
}

#[tauri::command]
pub async fn voice_stop(
    app: AppHandle,
    recorder: tauri::State<'_, Recorder>,
) -> Result<String, String> {
    let audio = recorder.stop()?;
    if audio.len() < MIN_SAMPLES {
        return Err("No te escuché. Mantén la grabación un poco más.".into());
    }
    let (_, path) = models::installed(&app, Kind::Whisper)?
        .ok_or_else(|| "Primero descarga el modelo de voz en Ajustes".to_string())?;

    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        use tauri::Manager;
        transcribe(&handle.state::<Engines>(), path, &audio)
    })
    .await
    .map_err(|_| "Falló la transcripción".to_string())?
}

// Graba un instante para que el sistema pida el permiso y confirmar que hay sonido.
#[tauri::command]
pub async fn voice_check_mic(recorder: tauri::State<'_, Recorder>) -> Result<(), String> {
    recorder.start()?;
    tokio::time::sleep(std::time::Duration::from_millis(700)).await;
    recorder.stop().map(|_| ())
}

fn transcribe(engines: &Engines, path: PathBuf, audio: &[f32]) -> Result<String, String> {
    let mut slot = engines
        .whisper
        .lock()
        .map_err(|_| "Whisper está ocupado".to_string())?;
    if slot.as_ref().is_none_or(|(loaded, _)| *loaded != path) {
        let ctx = WhisperContext::new_with_params(&path, WhisperContextParameters::default())
            .map_err(|_| "No se pudo abrir el modelo de voz. Descárgalo de nuevo.".to_string())?;
        *slot = Some((path, ctx));
    }
    let Some((_, ctx)) = slot.as_ref() else {
        return Err("No se pudo abrir el modelo de voz".into());
    };

    let mut state = ctx
        .create_state()
        .map_err(|_| "Falló la transcripción".to_string())?;
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some("es"));
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_special(false);
    params.set_print_timestamps(false);
    params.set_suppress_blank(true);
    state
        .full(params, audio)
        .map_err(|_| "Falló la transcripción".to_string())?;

    let text: String = (0..state.full_n_segments())
        .filter_map(|i| state.get_segment(i))
        .filter_map(|s| s.to_str_lossy().ok().map(|t| t.into_owned()))
        .collect::<Vec<_>>()
        .join(" ");
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err("No te escuché. Intenta de nuevo.".into());
    }
    Ok(text)
}
