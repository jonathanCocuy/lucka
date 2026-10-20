import Database from '@tauri-apps/plugin-sql'

// Same URL as src-tauri/src/lib.rs. The file lives in appConfigDir.
export const DB_FILE = 'lucka.db'

// What the resources use. Allows tests without Tauri.
export interface Db {
  execute(sql: string, binds?: unknown[]): Promise<{ rowsAffected: number }>
  select<T>(sql: string, binds?: unknown[]): Promise<T>
}

// The plugin uses a pool: BEGIN/COMMIT may land on different connections.
// So there are no transactions (accepted risk: local app, single user).
// sqlx opens every connection with foreign_keys = ON.
let connection: Promise<Db> | null = null

export function getDb(): Promise<Db> {
  connection ??= Database.load(`sqlite:${DB_FILE}`)
  return connection
}

// SQLite has no booleans and the plugin sends `true` as text.
export const bit = (value: boolean) => (value ? 1 : 0)

export const now = () => new Date().toISOString()

// `IN (?, ?, …)` with as many placeholders as ids.
export const marks = (ids: string[]) => ids.map(() => '?').join(', ')
