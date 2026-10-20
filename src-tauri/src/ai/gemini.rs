use serde_json::{Value, json};

use super::{Online, check, prompt};
use crate::error::{Code, Result};

const BASE: &str = "https://generativelanguage.googleapis.com/v1beta";

pub async fn ping(http: &reqwest::Client, key: &str) -> Result<()> {
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
) -> Result<Value> {
    let body = json!({
        "systemInstruction": { "parts": [{ "text": prompt::system(ctx) }] },
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
        .ok_or(Online::Gemini.error(Code::BadResponse))?;
    prompt::parse(text)
}
