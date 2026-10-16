use serde_json::{Value, json};

use super::{Online, check, prompt};

const BASE: &str = "https://api.anthropic.com/v1";
const VERSION: &str = "2023-06-01";

// Listar modelos valida la key y no gasta tokens.
pub async fn ping(http: &reqwest::Client, key: &str) -> Result<(), String> {
    let res = http
        .get(format!("{BASE}/models"))
        .header("x-api-key", key)
        .header("anthropic-version", VERSION)
        .timeout(super::TIMEOUT)
        .send()
        .await;
    check(Online::Anthropic, res).await.map(|_| ())
}

pub async fn interpret(
    http: &reqwest::Client,
    key: &str,
    model: &str,
    ctx: &prompt::Context,
) -> Result<Value, String> {
    let body = json!({
        "model": model,
        "max_tokens": 4096,
        "system": prompt::SYSTEM,
        "messages": [{ "role": "user", "content": prompt::user_message(ctx) }],
        // Extraer datos de una frase es simple: poco esfuerzo = más rápido y barato.
        "output_config": {
            "effort": "low",
            "format": { "type": "json_schema", "schema": prompt::schema() },
        },
    });
    let res = http
        .post(format!("{BASE}/messages"))
        .header("x-api-key", key)
        .header("anthropic-version", VERSION)
        .json(&body)
        .timeout(super::TIMEOUT)
        .send()
        .await;
    let data = check(Online::Anthropic, res).await?;
    if data["stop_reason"] == "refusal" {
        return Err("Claude no quiso procesar esa frase. Intenta decirla de otra forma.".into());
    }
    let text = data["content"]
        .as_array()
        .into_iter()
        .flatten()
        .find(|b| b["type"] == "text")
        .and_then(|b| b["text"].as_str())
        .ok_or_else(|| "Claude no devolvió una respuesta".to_string())?;
    prompt::parse(text)
}
