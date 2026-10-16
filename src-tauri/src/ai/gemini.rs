use serde_json::{Value, json};

use super::{Online, check, prompt};

const BASE: &str = "https://generativelanguage.googleapis.com/v1beta";

pub async fn ping(http: &reqwest::Client, key: &str) -> Result<(), String> {
    let res = http
        .get(format!("{BASE}/models"))
        .header("x-goog-api-key", key)
        .timeout(super::TIMEOUT)
        .send()
        .await;
    check(Online::Gemini, res).await.map(|_| ())
}

pub async fn interpret(
    http: &reqwest::Client,
    key: &str,
    model: &str,
    ctx: &prompt::Context,
) -> Result<Value, String> {
    let body = json!({
        "systemInstruction": { "parts": [{ "text": prompt::SYSTEM }] },
        "contents": [{ "role": "user", "parts": [{ "text": prompt::user_message(ctx) }] }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseJsonSchema": prompt::schema(),
        },
    });
    let res = http
        .post(format!("{BASE}/models/{model}:generateContent"))
        .header("x-goog-api-key", key)
        .json(&body)
        .timeout(super::TIMEOUT)
        .send()
        .await;
    let data = check(Online::Gemini, res).await?;
    let text = data["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .ok_or_else(|| "Gemini no devolvió una respuesta".to_string())?;
    prompt::parse(text)
}
