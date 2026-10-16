// Junta las librerías de llama.cpp en src-tauri/libs para que Tauri las meta al instalador.
// llama va como librería dinámica: su ggml choca con el de whisper si se enlazan juntos.
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { join } from 'node:path'

// Los nombres que el binario pide (@rpath/...). Fijos en tauri.macos.conf.json.
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
const dirFor = t => join(target, t, profile)

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

if (triple.startsWith('universal')) {
  // Una sola librería con las dos arquitecturas, igual que el binario.
  for (const lib of MAC_LIBS) {
    execFileSync('lipo', [
      '-create',
      join(dirFor('aarch64-apple-darwin'), lib),
      join(dirFor('x86_64-apple-darwin'), lib),
      '-output',
      join(out, lib),
    ])
  }
} else {
  // Sin --target, cargo deja todo en target/<perfil>.
  const dir = existsSync(dirFor(triple))
    ? dirFor(triple)
    : join(target, profile)
  const libs = triple.includes('windows')
    ? readdirSync(dir).filter(f => /^(ggml|llama).*\.dll$/.test(f))
    : MAC_LIBS
  for (const lib of libs) copyFileSync(join(dir, lib), join(out, lib))
}
