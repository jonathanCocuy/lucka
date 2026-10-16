use serde_json::{Value, json};

use super::{Online, check, prompt};

const BASE: &str = "https://api.openai.com/v1";

pub async fn ping(http: &reqwest::Client, key: &str) -> Result<(), String> {
    let res = http
        .get(format!("{BASE}/models"))
        .bearer_auth(key)
        .timeout(super::TIMEOUT)
        .send()
        .await;
    check(Online::OpenAi, res).await.map(|_| ())
}

pub async fn interpret(
    http: &reqwest::Client,
    key: &str,
    model: &str,
    ctx: &prompt::Context,
) -> Result<Value, String> {
    let body = json!({
        "model": model,
        "input": [
            { "role": "system", "content": prompt::SYSTEM },
            { "role": "user", "content": prompt::user_message(ctx) },
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "registros",
                "strict": true,
                "schema": prompt::schema(),
            }
        },
    });
    let res = http
        .post(format!("{BASE}/responses"))
        .bearer_auth(key)
        .json(&body)
        .timeout(super::TIMEOUT)
        .send()
        .await;
    let data = check(Online::OpenAi, res).await?;
    // output = [{ type: "message", content: [{ type: "output_text", text }] }, ...]
    let text = data["output"]
        .as_array()
        .into_iter()
        .flatten()
        .flat_map(|o| o["content"].as_array().into_iter().flatten())
        .find(|c| c["type"] == "output_text")
        .and_then(|c| c["text"].as_str())
        .ok_or_else(|| "OpenAI no devolvió una respuesta".to_string())?;
    prompt::parse(text)
}
