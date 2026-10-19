// Collects the llama.cpp libraries into src-tauri/libs so Tauri puts them in the installer.
// llama ships as a dynamic library: its ggml clashes with whisper's if both are linked statically.
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

// The names the binary asks for (@rpath/...). Same as tauri.macos.conf.json
// (frameworks: Tauri signs them) and src-tauri/build.rs (empty placeholders).
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

// Read from llama-cpp-sys's build output, not target/<profile>: it only copies them
// there if they don't exist yet, so they go stale on rebuilds.
function llamaLibs(t) {
  const base = existsSync(join(target, t, profile))
    ? join(target, t, profile, 'build')
    : join(target, profile, 'build')
  const dirs = readdirSync(base)
    .filter(d => d.startsWith('llama-cpp-sys-2-'))
    .map(d => join(base, d, 'out', windows ? 'bin' : 'lib'))
    .filter(d => existsSync(d))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  if (dirs.length === 0) throw new Error(`No llama build in ${base}`)
  return dirs[0]
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

if (triple.startsWith('universal')) {
  // One library with both architectures, like the binary.
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
