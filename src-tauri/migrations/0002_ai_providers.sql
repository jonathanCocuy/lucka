-- IAs que el usuario configuró para registrar por voz. No va en el respaldo:
-- depende del equipo (modelos bajados, keys en el llavero del sistema).
-- La key nunca se guarda aquí.
CREATE TABLE ai_providers (
  id TEXT PRIMARY KEY CHECK (id IN ('local', 'openai', 'anthropic', 'gemini')),
  model TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX ai_providers_one_default
  ON ai_providers (is_default)
  WHERE is_default = 1;

-- Cuándo se le preguntó si quería usar IA. null = aún no: se muestra el modal.
ALTER TABLE finance_settings ADD COLUMN ai_prompted_at TEXT;
