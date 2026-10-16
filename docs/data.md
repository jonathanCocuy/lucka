# Datos

Todo vive en un archivo SQLite en el equipo del usuario. Nada sale de ahí.

Única excepción: registrar por voz con una key en línea (ver abajo).

## Dónde está el archivo

| Sistema | Ruta                                                           |
| ------- | -------------------------------------------------------------- |
| macOS   | `~/Library/Application Support/dev.juanramirez.lucka/lucka.db` |
| Windows | `%APPDATA%\dev.juanramirez.lucka\lucka.db`                     |

- Sale de `appConfigDir` + `lucka.db`. Ajustes la muestra.
- El `identifier` de `tauri.conf.json` define la carpeta. Cambiarlo = la app no ve los datos viejos.

## Esquema

Fuente: `src-tauri/migrations/`. Corren al abrir la base.

| Tabla              | Qué guarda                                         |
| ------------------ | -------------------------------------------------- |
| `finance_settings` | Una fila. Nombre, ingreso, día de pago, onboarding |
| `fixed_expenses`   | Gastos fijos. Archivado lógico                     |
| `categories`       | Categorías con presupuesto. Archivado lógico       |
| `expenses`         | Gastos. Apuntan a un fijo **o** a una categoría    |
| `incomes`          | Ingresos extra                                     |
| `investments`      | Una fila. Aporte mensual y saldo                   |
| `ai_providers`     | IAs para la voz y cuál es la por defecto. Sin keys |

- Montos `INTEGER` (pesos, sin decimales).
- Fechas `TEXT`: `YYYY-MM-DD` para días, ISO para instantes.
- Booleanos `INTEGER` 0/1.
- Un solo fijo de inversión activo (índice único parcial).

## Migraciones

1. Archivo nuevo: `src-tauri/migrations/0002_nombre.sql`.
2. Registrarlo en `src-tauri/src/lib.rs` con `version: 2`.
3. Nunca editar una que ya se publicó.

## Respaldo (JSON)

Ajustes → Exportar / Importar. Código: `src/lib/local-db/backup.ts`.

```json
{
  "version": 1,
  "exportedAt": "2026-10-14T18:00:00.000Z",
  "data": {
    "profile": { "name": "…", "monthlyIncome": 0, "payday": 30 },
    "onboarded": true,
    "investment": null,
    "fixed": [],
    "categories": [],
    "expenses": [],
    "incomes": []
  }
}
```

- Incluye fijos y categorías archivados: los gastos viejos apuntan a ellos.
- Importar valida forma y `version`, y reemplaza todo.
- Cambio de forma → subir `BACKUP_VERSION`.
- `ai_providers` y `ai_prompted_at` no van: dependen del equipo.

## Registrar por voz

- Voz → texto: Whisper, siempre en el equipo. El audio no sale.
- Texto → JSON: la IA que el usuario marcó por defecto.
  - **Local** (Qwen, llama.cpp): nada sale del equipo.
  - **OpenAI / Anthropic / Gemini**: el texto dicho y los nombres de categorías y fijos van a ese proveedor. La app lo avisa antes de pedir la key.
- Keys: llavero del sistema (Keychain / Credential Manager), crate `keyring`.
  - Nunca en SQLite ni en el respaldo.
  - El front la manda una vez al guardarla. Solo Rust la lee.
  - Se prueba antes de guardar. Quitar el proveedor la borra.
- Modelos: `appDataDir/models`. Uno por tipo; bajar otro reemplaza al anterior.
