mod anthropic;
mod gemini;
mod keys;
pub mod local;
mod openai;
mod prompt;

use std::time::Duration;

use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::voice::{Engines, models};

// Una frase no debería tardar más. Evita que el botón quede colgado.
const TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Clone, Copy)]
pub enum Online {
    OpenAi,
    Anthropic,
    Gemini,
}

impl Online {
    fn parse(id: &str) -> Result<Self, String> {
        match id {
            "openai" => Ok(Self::OpenAi),
            "anthropic" => Ok(Self::Anthropic),
            "gemini" => Ok(Self::Gemini),
            _ => Err("Proveedor desconocido".into()),
        }
    }

    fn id(self) -> &'static str {
        match self {
            Self::OpenAi => "openai",
            Self::Anthropic => "anthropic",
            Self::Gemini => "gemini",
        }
    }

    fn name(self) -> &'static str {
        match self {
            Self::OpenAi => "OpenAI",
            Self::Anthropic => "Anthropic",
            Self::Gemini => "Gemini",
        }
    }
}

// Convierte la respuesta HTTP en JSON o en un error que el usuario entienda.
async fn check(
    provider: Online,
    res: Result<reqwest::Response, reqwest::Error>,
) -> Result<Value, String> {
    let name = provider.name();
    let res = res.map_err(|_| format!("No hay conexión con {name}. Revisa tu internet."))?;
    match res.status().as_u16() {
        200..=299 => res
            .json()
            .await
            .map_err(|_| format!("{name} respondió algo inesperado")),
        401 | 403 => Err(format!(
            "{name} rechazó la key. Revisa que esté bien copiada y activa."
        )),
        404 => Err(format!(
            "{name} no reconoce el modelo elegido. Cambia de modelo en Ajustes."
        )),
        429 => Err(format!(
            "{name} dice que llegaste al límite de uso. Revisa tu saldo o espera un poco."
        )),
        code => Err(format!("{name} falló ({code}). Intenta de nuevo.")),
    }
}

// Los ids de modelo van en la URL de Gemini: nada fuera de esto.
fn valid_model(model: &str) -> Result<&str, String> {
    let ok = !model.is_empty()
        && model
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '.' | '_'));
    if ok {
        Ok(model)
    } else {
        Err("Modelo inválido".into())
    }
}

// Se prueba antes de guardar: una key mala nunca llega al llavero.
#[tauri::command]
pub async fn ai_save_key(
    http: tauri::State<'_, reqwest::Client>,
    provider: String,
    key: String,
) -> Result<(), String> {
    let provider = Online::parse(&provider)?;
    let key = key.trim();
    if key.is_empty() {
        return Err("Pega tu key".into());
    }
    match provider {
        Online::OpenAi => openai::ping(&http, key).await?,
        Online::Anthropic => anthropic::ping(&http, key).await?,
        Online::Gemini => gemini::ping(&http, key).await?,
    }
    keys::save(provider, key)
}

#[tauri::command]
pub fn ai_delete_key(provider: String) -> Result<(), String> {
    keys::delete(Online::parse(&provider)?)
}

#[tauri::command]
pub async fn ai_interpret(
    app: AppHandle,
    http: tauri::State<'_, reqwest::Client>,
    provider: String,
    model: String,
    context: prompt::Context,
) -> Result<Value, String> {
    if provider == "local" {
        let (_, path) = models::installed(&app, models::Kind::Llm)?
            .ok_or_else(|| "Primero descarga el modelo local en Ajustes".to_string())?;
        let handle = app.clone();
        return tauri::async_runtime::spawn_blocking(move || {
            local::interpret(&handle.state::<Engines>(), path, &context)
        })
        .await
        .map_err(|_| "El modelo local falló. Intenta de nuevo.".to_string())?;
    }

    let online = Online::parse(&provider)?;
    let model = valid_model(&model)?;
    let key = keys::read(online)?;
    match online {
        Online::OpenAi => openai::interpret(&http, &key, model, &context).await,
        Online::Anthropic => anthropic::interpret(&http, &key, model, &context).await,
        Online::Gemini => gemini::interpret(&http, &key, model, &context).await,
    }
}
