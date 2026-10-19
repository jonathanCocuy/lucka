use serde::Deserialize;
use serde_json::{Value, json};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Context {
    pub text: String,
    pub today: String,
    pub categories: Vec<String>,
    pub fixed: Vec<String>,
}

// Every field required and no nulls: OpenAI strict mode and the local grammar need that.
// "No data" = "" or 0. The front (resolve.ts) decides what to do with it.
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
                        "amount": { "type": "integer" },
                        "description": { "type": "string" },
                        "category": { "type": "string" },
                        "budget": { "type": "integer" },
                        "date": { "type": "string" }
                    }
                }
            }
        }
    })
}

pub const SYSTEM: &str = "Conviertes lo que una persona dice sobre su dinero en registros para una app de finanzas personales en Colombia.

Cada cosa que mencione es un ítem:
- \"expense\": un gasto. \"category\" = la categoría de la lista que corresponda, escrita igual. Si ninguna tiene que ver (ej. \"regalos\" no es \"Comida\"), inventa un nombre corto (1-2 palabras, con mayúscula inicial). Si pidió un presupuesto, siempre es una categoría nueva.
- \"fixed\": el pago de uno de sus gastos fijos. Solo si coincide con un nombre de \"fijos_pendientes\"; \"category\" = ese nombre, escrito igual.
- \"income\": plata que le entró (bono, venta, trabajo extra). \"category\" = \"\".

Campos:
- \"amount\": pesos colombianos, entero. \"20 mil\" = 20000, \"una luca\" = 1000, \"un millón\" = 1000000, \"1,5 millones\" = 1500000. Si no dijo el monto, 0.
- \"description\": qué fue, corto. Ej. \"Almuerzo\".
- \"budget\": solo si pidió un presupuesto para una categoría nueva; si no, 0.
- \"date\": YYYY-MM-DD. Resuelve \"ayer\", \"el lunes\", etc. con la fecha de hoy. Si no dijo fecha, \"\".

No inventes ítems ni montos que no dijo. Si no dijo nada de dinero, devuelve una lista vacía.

Ejemplo. Categorías: [\"Comida\", \"Ocio\"]. Fijos: [\"Arriendo\", \"Internet\"]. Hoy: 2026-03-10.
Dijo: \"ayer gasté 15 mil en un café, pagué el internet y me entró un bono de 200 mil\"
Respuesta: {\"items\":[{\"type\":\"expense\",\"amount\":15000,\"description\":\"Café\",\"category\":\"Comida\",\"budget\":0,\"date\":\"2026-03-09\"},{\"type\":\"fixed\",\"amount\":0,\"description\":\"Internet\",\"category\":\"Internet\",\"budget\":0,\"date\":\"\"},{\"type\":\"income\",\"amount\":200000,\"description\":\"Bono\",\"category\":\"\",\"budget\":0,\"date\":\"\"}]}";

pub fn user_message(ctx: &Context) -> String {
    json!({
        "hoy": ctx.today,
        "categorias": ctx.categories,
        "fijos_pendientes": ctx.fixed,
        "lo_que_dijo": ctx.text,
    })
    .to_string()
}

// Whatever a provider returns must be JSON. The front validates the shape.
pub fn parse(raw: &str) -> Result<Value, String> {
    serde_json::from_str(raw.trim())
        .map_err(|_| "La IA no respondió en el formato esperado. Intenta de nuevo.".into())
}
