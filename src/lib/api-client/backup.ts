import { getVersion } from '@tauri-apps/api/app'
import { appConfigDir, join } from '@tauri-apps/api/path'
import { ask, open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { exportBackup, importBackup, wipeAll } from '@/lib/local-db/backup'
import { DB_FILE } from '@/lib/local-db/db'
import { ApiClientError } from './http'

const FILTERS = [{ name: 'Respaldo de Lucka', extensions: ['json'] }]

export async function appInfo() {
  const [version, dir] = await Promise.all([getVersion(), appConfigDir()])
  return { version, dbPath: await join(dir, DB_FILE) }
}

// false = the user cancelled.
export async function exportToFile(): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10)
  const path = await save({
    defaultPath: `lucka-${today}.json`,
    filters: FILTERS,
  })
  if (!path) return false
  const backup = await exportBackup()
  await writeTextFile(path, JSON.stringify(backup, null, 2))
  return true
}

export async function importFromFile(): Promise<boolean> {
  const path = await open({
    multiple: false,
    directory: false,
    filters: FILTERS,
  })
  if (!path) return false
  const confirmed = await ask(
    'Se reemplazan todos tus datos por los del archivo. No se puede deshacer.',
    { title: 'Importar datos', kind: 'warning', okLabel: 'Importar' },
  )
  if (!confirmed) return false

  let parsed: unknown
  try {
    parsed = JSON.parse(await readTextFile(path))
  } catch {
    throw new ApiClientError(422, 'El archivo no es un JSON válido')
  }
  await importBackup(parsed)
  return true
}

// Double confirmation: there's no trash and no cloud.
export async function wipeWithConfirm(): Promise<boolean> {
  const first = await ask('Se borran todos tus datos de este computador.', {
    title: 'Borrar todos mis datos',
    kind: 'warning',
    okLabel: 'Continuar',
  })
  if (!first) return false
  const second = await ask(
    '¿Seguro? Esto no se puede deshacer. Exporta antes si quieres guardarlos.',
    { title: 'Último aviso', kind: 'warning', okLabel: 'Borrar todo' },
  )
  if (!second) return false
  await wipeAll()
  return true
}
