mod anthropic;
mod gemini;
mod keys;
pub mod local;
mod openai;
mod prompt;

use std::time::Duration;

use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::error::{AppError, Code, Result};
use crate::voice::{Engines, models};

// One sentence shouldn't take longer. Keeps the button from hanging.
const TIMEOUT: Duration = Duration::from_secs(60);

#[derive(Clone, Copy)]
pub enum Online {
    OpenAi,
    Anthropic,
    Gemini,
}

impl Online {
    fn parse(id: &str) -> Result<Self> {
        match id {
            "openai" => Ok(Self::OpenAi),
            "anthropic" => Ok(Self::Anthropic),
            "gemini" => Ok(Self::Gemini),
            _ => Err(Code::UnknownProvider.into()),
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

    fn error(self, code: Code) -> AppError {
        AppError::provider(code, self.name())
    }
}

// Turns the HTTP response into JSON or an error the user understands.
async fn check(provider: Online, res: reqwest::Result<reqwest::Response>) -> Result<Value> {
    let res = res.map_err(|_| provider.error(Code::Offline))?;
    match res.status().as_u16() {
        200..=299 => res
            .json()
            .await
            .map_err(|_| provider.error(Code::BadResponse)),
        401 | 403 => Err(provider.error(Code::KeyRejected)),
        404 => Err(provider.error(Code::ModelNotFound)),
        429 => Err(provider.error(Code::RateLimited)),
        status => Err(provider.error(Code::ProviderFailed).with_status(status)),
    }
}

// Model ids go into Gemini's URL: nothing outside this set.
fn valid_model(model: &str) -> Result<&str> {
    let ok = !model.is_empty()
        && model
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '.' | '_'));
    if ok {
        Ok(model)
    } else {
        Err(Code::InvalidModel.into())
    }
}

// Tested before saving: a bad key never reaches the keychain.
#[tauri::command]
pub async fn ai_save_key(
    http: tauri::State<'_, reqwest::Client>,
    provider: String,
    key: String,
) -> Result<()> {
    let provider = Online::parse(&provider)?;
    let key = key.trim();
    if key.is_empty() {
        return Err(Code::EmptyKey.into());
    }
    match provider {
        Online::OpenAi => openai::ping(&http, key).await?,
        Online::Anthropic => anthropic::ping(&http, key).await?,
        Online::Gemini => gemini::ping(&http, key).await?,
    }
    keys::save(provider, key)
}

#[tauri::command]
pub fn ai_delete_key(provider: String) -> Result<()> {
    keys::delete(Online::parse(&provider)?)
}

#[tauri::command]
pub async fn ai_interpret(
    app: AppHandle,
    http: tauri::State<'_, reqwest::Client>,
    provider: String,
    model: String,
    context: prompt::Context,
) -> Result<Value> {
    if provider == "local" {
        let (_, path) =
            models::installed(&app, models::Kind::Llm)?.ok_or(Code::LocalModelMissing)?;
        let handle = app.clone();
        return tauri::async_runtime::spawn_blocking(move || {
            local::interpret(&handle.state::<Engines>(), path, &context)
        })
        .await
        .map_err(|_| Code::LocalModelFailed)?;
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
