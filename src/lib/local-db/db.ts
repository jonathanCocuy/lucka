import Database from '@tauri-apps/plugin-sql'

// Misma URL que src-tauri/src/lib.rs. El archivo vive en appConfigDir.
export const DB_FILE = 'lucka.db'

// Lo que usan los recursos. Permite tests sin Tauri.
export interface Db {
  execute(sql: string, binds?: unknown[]): Promise<{ rowsAffected: number }>
  select<T>(sql: string, binds?: unknown[]): Promise<T>
}

// El plugin usa un pool: BEGIN/COMMIT pueden caer en conexiones distintas.
// Por eso no hay transacciones (riesgo aceptado: app local, un solo usuario).
// sqlx abre cada conexión con foreign_keys = ON.
let connection: Promise<Db> | null = null

export function getDb(): Promise<Db> {
  connection ??= Database.load(`sqlite:${DB_FILE}`)
  return connection
}

// SQLite no tiene booleanos y el plugin manda `true` como texto.
export const bit = (value: boolean) => (value ? 1 : 0)

export const now = () => new Date().toISOString()

// `IN (?, ?, …)` con tantos marcadores como ids.
export const marks = (ids: string[]) => ids.map(() => '?').join(', ')
