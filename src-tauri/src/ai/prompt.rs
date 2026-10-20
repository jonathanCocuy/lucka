use serde::Deserialize;
use serde_json::{Value, json};

use crate::error::{Code, Result};
use crate::voice::Language;

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Currency {
    Usd,
    Cop,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Context {
    pub text: String,
    pub today: String,
    pub categories: Vec<String>,
    pub fixed: Vec<String>,
    pub language: Language,
    pub currency: Currency,
}

// Every field required and no nulls: OpenAI strict mode and the local grammar need that.
// "No data" = "" or 0. The front (resolve.ts) decides what to do with it.
// Amounts are whole money units, with decimals for dollars. The front turns them into cents.
pub fn schema() -> Value {
    json!({
        "type": "object",
        "additionalProperties": false,
        "required": ["items"],
        "properties": {
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": ["type", "amount", "description", "category", "budget", "date"],
                    "properties": {
                        "type": { "type": "string", "enum": ["expense", "fixed", "income"] },
                        "amount": { "type": "number" },
                        "description": { "type": "string" },
                        "category": { "type": "string" },
                        "budget": { "type": "number" },
                        "date": { "type": "string" }
                    }
                }
            }
        }
    })
}

const RULES: &str = "You turn what a person says about their money into records for a personal finance app.

Each thing they mention is an item:
- \"expense\": money spent. \"category\" = the matching category from the list, written exactly the same. If none fits (e.g. \"gifts\" is not \"Food\"), make up a short name (1-2 words, first letter capitalized). If they asked for a budget, it's always a new category.
- \"fixed\": paying one of their fixed expenses. Only if it matches a name in \"pending_fixed\"; \"category\" = that name, written exactly the same.
- \"income\": money they received (bonus, sale, side job). \"category\" = \"\".

Fields:
- \"amount\": MONEY_RULE If no amount was said, 0.
- \"description\": what it was, short. E.g. \"Lunch\".
- \"budget\": only if they asked for a budget for a new category, with the same money rules; otherwise 0.
- \"date\": YYYY-MM-DD. Resolve \"yesterday\", \"last Monday\", \"ayer\", \"el lunes\", etc. with today's date. If no date was said, \"\".

Write descriptions and new category names in LANGUAGE.
Don't invent items or amounts they didn't say. If they said nothing about money, return an empty list.";

const COP_RULE: &str = "Colombian pesos, a whole number. \"20 mil\" or \"20k\" = 20000, \"una luca\" = 1000, \"un millón\" = 1000000, \"1,5 millones\" = 1500000.";
const USD_RULE: &str = "US dollars, up to 2 decimals. \"$4.50\", \"4,50\" or \"four fifty\" = 4.5, \"20 bucks\" = 20, \"5k\" = 5000, \"a grand\" = 1000.";

// One worked example in the person's language, with amounts in their currency.
fn example(language: Language, currency: Currency) -> String {
    let (small, big, small_n, big_n) = match (language, currency) {
        (Language::Es, Currency::Cop) => ("15 mil", "200 mil", "15000", "200000"),
        (Language::Es, Currency::Usd) => ("4,50", "200 dólares", "4.5", "200"),
        (Language::En, Currency::Cop) => ("15k", "200k", "15000", "200000"),
        (Language::En, Currency::Usd) => ("$4.50", "$200", "4.5", "200"),
    };
    let (categories, fixed, said, coffee, food, bonus) = match language {
        Language::Es => (
            "[\"Comida\", \"Ocio\"]",
            "[\"Arriendo\", \"Internet\"]",
            format!("ayer gasté {small} en un café, pagué el internet y me entró un bono de {big}"),
            "Café",
            "Comida",
            "Bono",
        ),
        Language::En => (
            "[\"Food\", \"Fun\"]",
            "[\"Rent\", \"Internet\"]",
            format!("yesterday I spent {small} on coffee, paid the internet and got a {big} bonus"),
            "Coffee",
            "Food",
            "Bonus",
        ),
    };
    format!(
        "Example. Categories: {categories}. Pending fixed: {fixed}. Today: 2026-03-10.
Said: \"{said}\"
Answer: {{\"items\":[{{\"type\":\"expense\",\"amount\":{small_n},\"description\":\"{coffee}\",\"category\":\"{food}\",\"budget\":0,\"date\":\"2026-03-09\"}},{{\"type\":\"fixed\",\"amount\":0,\"description\":\"Internet\",\"category\":\"Internet\",\"budget\":0,\"date\":\"\"}},{{\"type\":\"income\",\"amount\":{big_n},\"description\":\"{bonus}\",\"category\":\"\",\"budget\":0,\"date\":\"\"}}]}}"
    )
}

pub fn system(ctx: &Context) -> String {
    let money = match ctx.currency {
        Currency::Cop => COP_RULE,
        Currency::Usd => USD_RULE,
    };
    let language = match ctx.language {
        Language::Es => "Spanish",
        Language::En => "English",
    };
    let rules = RULES
        .replace("MONEY_RULE", money)
        .replace("LANGUAGE", language);
    format!("{rules}\n\n{}", example(ctx.language, ctx.currency))
}

pub fn user_message(ctx: &Context) -> String {
    json!({
        "today": ctx.today,
        "categories": ctx.categories,
        "pending_fixed": ctx.fixed,
        "said": ctx.text,
    })
    .to_string()
}

// Whatever a provider returns must be JSON. The front validates the shape.
pub fn parse(raw: &str) -> Result<Value> {
    Ok(serde_json::from_str(raw.trim()).map_err(|_| Code::BadFormat)?)
}
