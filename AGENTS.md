<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Reglas para cualquier agente (Claude, Cursor, etc.) en este repo.
Leer completo antes de planear o escribir código.

---

## 1. Cómo escribir (lo más importante)

Quien lee este repo se cansa con párrafos largos. Todo texto debe ser corto.
Aplica a: planes, respuestas, `.md`, comentarios, commits y PRs.

- Frases cortas. Una idea por línea.
- Viñetas en vez de párrafos. Máximo 3 líneas seguidas de prosa.
- Palabras simples. Nada de jerga si hay una palabra común.
- Solo lo que importa para decidir o actuar. Si se puede borrar sin perder nada, se borra.
- No repetir lo que ya dijo el usuario ni lo que muestra el código.
- Comentarios en código: solo el **por qué**, nunca el qué. Una línea si se puede.

Ejemplos: `docs/writing-style.md`.

---

## 2. Planes

Todo plan sigue este formato. Nada más.

```markdown
## Qué voy a hacer

- 1-3 viñetas

## Por qué

- 1-2 viñetas

## Cómo va a funcionar

1. Paso del flujo
2. Paso del flujo

## Archivos

- `ruta/archivo.ts` → qué cambia

## Preguntas

(las que falten, con opciones)

## Tests

(casos elegidos por el usuario)
```

Reglas:

- **Siempre preguntar antes de decidir** en temas de:
  - Arquitectura (dónde vive la lógica, tabla nueva vs columna, SQL en `local-db` vs comando Rust).
  - Negocio (quién puede hacer qué, qué pasa en el caso raro, qué ve el usuario si falla).
- Cada pregunta trae 2-4 opciones con una línea de pro/contra. Marcar la recomendada.
- Usar la herramienta de preguntas (AskUserQuestion) cuando exista.
- Si el código responde la pregunta, leer el código en vez de preguntar.
- El desarrollador debe terminar el plan sabiendo **qué** se hace y **por qué**.

---

## 3. Tests unitarios

- Solo **jest**. Archivo junto al código: `mi-archivo.test.ts`.
- **Antes de escribir tests, preguntar** qué casos probar:
  - Proponer edge cases reales como opciones (multi-select).
  - El usuario elige. Solo se escriben los elegidos.
- No escribir tests para:
  - Casos que no pueden pasar (tipos ya lo impiden, input ya validado antes).
  - Código sin lógica (componentes que solo pintan, wrappers, constantes).
  - Librerías externas (Tauri, Next).
- Un test = un comportamiento. Nombre en español que diga qué se espera.
  - ✅ `lanza 404 si el gasto no existe` · ❌ `test removeExpense case 2`
- Sin lógica dentro del test (sin `if`, sin loops).
- Mocks solo en el borde: `getDb`, `invoke` de Tauri.
- Bug arreglado → un test que falle sin el fix.

Agente: `test-planner`. Correr: `pnpm test`.

---

## 4. Stack y estructura

- App de escritorio local-first: **Tauri v2** (macOS + Windows).
- UI: Next.js 16 como sitio estático (`output: 'export'` → `out/`), React 19, TypeScript estricto, **pnpm**.
- Datos: SQLite local vía `tauri-plugin-sql`. Sin servidor, sin login, sin nube.
- Estructura:
  - `src/app/` → rutas. Componentes de un solo uso viven junto a su ruta.
  - `src/components/ui/` → componentes reusados en toda la app.
  - `src/lib/local-db/` → un archivo por recurso. **Único lugar con SQL.**
  - `src/lib/api-client/` → lo que llama el front. Reglas de negocio + errores (`ApiClientError`).
  - `src/lib/finance/` → tipos, validación y cálculos puros.
  - `src-tauri/` → shell Rust, plugins, permisos (`capabilities/`) y migraciones.
- Archivos en **kebab-case** (`mi-componente.tsx`). Lint lo bloquea.
- Sin barrels (`index.ts` que solo re-exporta).

---

## 5. Datos y permisos

- Sin auth ni roles: un usuario por computador.
- Datos en claro en el archivo SQLite del usuario. Nunca salen del equipo.
  - Excepción: voz con key en línea. El texto dicho va al proveedor elegido.
  - Keys solo en el llavero del sistema. Nunca en SQLite, logs ni respaldos.
- Nada de servidor: sin `cookies()`, `headers()`, route handlers ni server actions. Rompen el export.
- Cada API de Tauri nueva necesita su permiso en `src-tauri/capabilities/default.json`. Pedir lo mínimo.
- CSP estricta en `tauri.conf.json`. No abrir dominios externos.

Detalle: `docs/architecture.md` (Data layer, AI and voice).

---

## 6. CSS

- **Prohibido Tailwind.** CSS Modules (`archivo.module.css`) + variables.
- Colores, espacios y fuentes salen de `src/app/globals.css` con `var(--token)`.
- Colores literales (`#fff`, `rgb()`) solo en `globals.css`. Lint y hooks lo bloquean.
- Si falta un token, preguntar cuál agregar. No inventarlo.

---

## 7. Base de datos

- Cambio de esquema = archivo nuevo en `src-tauri/migrations/` (`0002_nombre.sql`) + registrarlo en `src-tauri/src/lib.rs` con la versión siguiente.
- Nunca editar una migración ya mergeada. Ya corrió en equipos de usuarios.
- Si cambia la forma de los datos, revisar export/import (`src/lib/local-db/backup.ts`) y subir `BACKUP_VERSION` si hace falta.
- Probar con `pnpm desktop`: base nueva y base existente.

---

## 8. Git

- Ramas protegidas: `main`, `staging`, `feedback`. **Nunca push directo.** Rama + PR.
- **Nunca** saltarse hooks: nada de `--no-verify`, `-n`, `HUSKY=0`.
- Si un hook falla, se arregla el error. No se rodea.

---

## 9. Prohibido

- Tailwind o cualquier librería de utilidades CSS.
- `any`. Usar el tipo real o `unknown` + validación.
- `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`.
- npm, yarn, bun, npx. Solo pnpm (`pnpm dlx` en vez de `npx`).
- Editar `.env*` o lockfiles a mano.
- Agregar librerías sin preguntar.
- Features, abstracciones o manejo de errores que nadie pidió.

Los hooks de `.claude/hooks/` bloquean casi todo esto. Si un hook bloquea: **no intentar rodearlo**. Arreglar o preguntar.

---

## 10. Tarea terminada

Una tarea NO está lista si falla algo de esto:

```bash
pnpm check   # lint + prettier + tipos + tests + build + cargo check
```

Al terminar, responder con este formato (corto):

```markdown
**Qué cambió:** 1-2 líneas para producto.
**Detalle técnico:** 2-4 viñetas.
**Cómo probar:** pasos: qué correr, qué abrir, qué se debe ver.
```
