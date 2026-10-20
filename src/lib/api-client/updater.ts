import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'

export type { Update }

// No internet or no Release: the app carries on with no notice.
export async function findUpdate(): Promise<Update | null> {
  try {
    return await check()
  } catch {
    return null
  }
}

export async function installAndRestart(update: Update) {
  await update.downloadAndInstall()
  await relaunch()
}
