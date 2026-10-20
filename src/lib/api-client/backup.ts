import { getVersion } from '@tauri-apps/api/app'
import { appConfigDir, join } from '@tauri-apps/api/path'
import { ask, open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { Messages } from '@/lib/i18n/en'
import { exportBackup, importBackup, wipeAll } from '@/lib/local-db/backup'
import { DB_FILE } from '@/lib/local-db/db'
import { ApiClientError } from './http'

// The native dialogs get their text from the caller, in the app's language.
type Copy = Messages['backup']

const filters = (copy: Copy) => [{ name: copy.fileType, extensions: ['json'] }]

export async function appInfo() {
  const [version, dir] = await Promise.all([getVersion(), appConfigDir()])
  return { version, dbPath: await join(dir, DB_FILE) }
}

// false = the user cancelled.
export async function exportToFile(copy: Copy): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10)
  const path = await save({
    defaultPath: `lucka-${today}.json`,
    filters: filters(copy),
  })
  if (!path) return false
  const backup = await exportBackup()
  await writeTextFile(path, JSON.stringify(backup, null, 2))
  return true
}

export async function importFromFile(copy: Copy): Promise<boolean> {
  const path = await open({
    multiple: false,
    directory: false,
    filters: filters(copy),
  })
  if (!path) return false
  const confirmed = await ask(copy.importMessage, {
    title: copy.importTitle,
    kind: 'warning',
    okLabel: copy.importOk,
    cancelLabel: copy.cancel,
  })
  if (!confirmed) return false

  let parsed: unknown
  try {
    parsed = JSON.parse(await readTextFile(path))
  } catch {
    throw new ApiClientError(422, 'backupNotJson')
  }
  await importBackup(parsed)
  return true
}

// Double confirmation: there's no trash and no cloud.
export async function wipeWithConfirm(copy: Copy): Promise<boolean> {
  const first = await ask(copy.wipeMessage, {
    title: copy.wipeTitle,
    kind: 'warning',
    okLabel: copy.wipeOk,
    cancelLabel: copy.cancel,
  })
  if (!first) return false
  const second = await ask(copy.lastMessage, {
    title: copy.lastTitle,
    kind: 'warning',
    okLabel: copy.lastOk,
    cancelLabel: copy.cancel,
  })
  if (!second) return false
  await wipeAll()
  return true
}
