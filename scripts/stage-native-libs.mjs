// Junta las librerías de llama.cpp en src-tauri/libs para que Tauri las meta al instalador.
// llama va como librería dinámica: su ggml choca con el de whisper si se enlazan juntos.
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'

// Los nombres que el binario pide (@rpath/...). Fijos en tauri.macos.conf.json (frameworks: Tauri las firma).
const MAC_LIBS = [
  'libggml.0.dylib',
  'libggml-base.0.dylib',
  'libggml-cpu.0.dylib',
  'libggml-metal.0.dylib',
  'libllama.0.dylib',
  'libllama-common.0.dylib',
]

const target = join('src-tauri', 'target')
const out = join('src-tauri', 'libs')
const triple = process.env.TAURI_ENV_TARGET_TRIPLE ?? ''
const profile = process.env.TAURI_ENV_DEBUG === 'true' ? 'debug' : 'release'
const windows = triple.includes('windows')

// Se leen de la salida de llama-cpp-sys, no de target/<perfil>: ahí las copia
// solo si no existen y quedan viejas al recompilar.
function llamaLibs(t) {
  const base = existsSync(join(target, t, profile))
    ? join(target, t, profile, 'build')
    : join(target, profile, 'build')
  const dirs = readdirSync(base)
    .filter(d => d.startsWith('llama-cpp-sys-2-'))
    .map(d => join(base, d, 'out', windows ? 'bin' : 'lib'))
    .filter(d => existsSync(d))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  if (dirs.length === 0) throw new Error(`No hay build de llama en ${base}`)
  return dirs[0]
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

if (triple.startsWith('universal')) {
  // Una sola librería con las dos arquitecturas, igual que el binario.
  const arm = llamaLibs('aarch64-apple-darwin')
  const intel = llamaLibs('x86_64-apple-darwin')
  for (const lib of MAC_LIBS) {
    execFileSync('lipo', [
      '-create',
      join(arm, lib),
      join(intel, lib),
      '-output',
      join(out, lib),
    ])
  }
} else {
  const dir = llamaLibs(triple)
  const libs = windows
    ? readdirSync(dir).filter(f => /^(ggml|llama).*\.dll$/.test(f))
    : MAC_LIBS
  for (const lib of libs) copyFileSync(join(dir, lib), join(out, lib))
}
