pub mod models;
pub mod recorder;

use std::path::PathBuf;
use std::sync::Mutex;

use serde::Deserialize;
use tauri::AppHandle;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

use crate::ai::local::LocalLlm;
use crate::error::{Code, Result};
use models::Kind;
use recorder::{RATE, Recorder};

// Half a second: anything shorter is an accidental click.
const MIN_SAMPLES: usize = RATE as usize / 2;

// The app's language. Whisper and the AI prompt both follow it.
#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    En,
    Es,
}

impl Language {
    fn code(self) -> &'static str {
        match self {
            Self::En => "en",
            Self::Es => "es",
        }
    }
}

// Models loaded in memory. Loading Whisper or the LLM takes seconds, so they're reused.
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

    // ggml aborts if the process exits with Metal models still alive.
    pub fn unload_all(&self) {
        self.unload(Kind::Whisper);
        self.unload(Kind::Llm);
    }
}

#[tauri::command]
pub fn voice_start(recorder: tauri::State<'_, Recorder>) -> Result<()> {
    recorder.start()
}

#[tauri::command]
pub async fn voice_stop(
    app: AppHandle,
    recorder: tauri::State<'_, Recorder>,
    language: Language,
) -> Result<String> {
    let audio = recorder.stop()?;
    if audio.len() < MIN_SAMPLES {
        return Err(Code::TooShort.into());
    }
    let (_, path) = models::installed(&app, Kind::Whisper)?.ok_or(Code::VoiceModelMissing)?;

    let handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        use tauri::Manager;
        transcribe(&handle.state::<Engines>(), path, &audio, language)
    })
    .await
    .map_err(|_| Code::TranscriptionFailed)?
}

// Records a moment so the OS asks for permission, and checks there is sound.
#[tauri::command]
pub async fn voice_check_mic(recorder: tauri::State<'_, Recorder>) -> Result<()> {
    recorder.start()?;
    tokio::time::sleep(std::time::Duration::from_millis(700)).await;
    recorder.stop().map(|_| ())
}

fn transcribe(
    engines: &Engines,
    path: PathBuf,
    audio: &[f32],
    language: Language,
) -> Result<String> {
    let mut slot = engines.whisper.lock().map_err(|_| Code::WhisperBusy)?;
    if slot.as_ref().is_none_or(|(loaded, _)| *loaded != path) {
        let ctx = WhisperContext::new_with_params(&path, WhisperContextParameters::default())
            .map_err(|_| Code::VoiceModelBroken)?;
        *slot = Some((path, ctx));
    }
    let Some((_, ctx)) = slot.as_ref() else {
        return Err(Code::VoiceModelBroken.into());
    };

    let mut state = ctx.create_state().map_err(|_| Code::TranscriptionFailed)?;
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    params.set_language(Some(language.code()));
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_special(false);
    params.set_print_timestamps(false);
    params.set_suppress_blank(true);
    state
        .full(params, audio)
        .map_err(|_| Code::TranscriptionFailed)?;

    let text: String = (0..state.full_n_segments())
        .filter_map(|i| state.get_segment(i))
        .filter_map(|s| s.to_str_lossy().ok().map(|t| t.into_owned()))
        .collect::<Vec<_>>()
        .join(" ");
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err(Code::NotHeard.into());
    }
    Ok(text)
}
