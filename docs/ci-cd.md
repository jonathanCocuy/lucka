# CI/CD

## Qué corre y cuándo

| Workflow          | Cuándo                                      | Qué hace                                                           |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| `ci.yml`          | PR a feedback / staging / main              | lint, prettier, tipos, tests, build + cargo check/clippy           |
| `release.yml`     | push a `main` (merge de un PR)              | reusa `ci.yml` → si la versión es nueva, publica                   |
| `build-check.yml` | PR que toca `src-tauri/`, `scripts/` o deps | build real macOS universal + Windows, firma y arranque. No publica |

Hooks locales:

- `pre-commit` → `lint-staged` (eslint + prettier en lo cambiado).
- `pre-push` → bloquea push directo a `main`, `staging`, `feedback`.

## Publicar una versión

1. En el PR, subir `version` en `src-tauri/tauri.conf.json` (manda esta).
   - Mantener igual `package.json` y `src-tauri/Cargo.toml`.
2. Mergear a `main`.
3. `release.yml`:
   - Si el tag `v<versión>` ya existe → termina sin publicar.
   - Crea un Release borrador.
   - Compila macOS (universal) y Windows (x64) en paralelo.
   - Sube `Lucka-macos.dmg` y `Lucka-windows-setup.exe` (nombres fijos).
   - Publica el Release. Las apps instaladas lo ven vía `latest.json`.

Merge sin subir versión → solo validaciones.

## Secrets (ya creados)

| Secret                               | Qué es                                           |
| ------------------------------------ | ------------------------------------------------ |
| `TAURI_SIGNING_PRIVATE_KEY`          | Llave privada del updater (`~/.tauri/lucka.key`) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Su contraseña                                    |

- La llave firma los updates. La app solo instala lo firmado con ella.
- No es firma Apple/Windows: no quita avisos de seguridad.
- Si se pierde, las apps instaladas no pueden actualizarse solas. Guardar copia.

## Proteger ramas

Repo → Settings → Branches (o Rules) → regla para `main`, `staging`, `feedback`:

- ✅ Require a pull request before merging
- ✅ Require status checks to pass → marcar `check` y `rust`
- ✅ Do not allow bypassing the above settings

## Si algo falla

- **`rust` falla en CI:** correr `pnpm cargo:check` y `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`.
- **Build falla por firma:** revisar los dos secrets.
- **Quedó un borrador a medias:** re-correr los jobs fallidos del mismo run. Si no, borrar el borrador y re-correr todo.
