# Cómo aportar

## Reglas clave

Completas en `AGENTS.md`. Las que más se olvidan:

- Textos cortos. Comentarios solo con el **por qué**.
- Solo **pnpm** (`pnpm dlx`, nunca `npx`).
- Sin Tailwind, `any`, `eslint-disable`, `@ts-ignore`.
- Archivos en kebab-case. Sin barrels.
- Colores solo como tokens de `src/app/globals.css`.
- SQL solo en `src/lib/local-db/`.
- Librería nueva → preguntar en un issue antes.

## Abrir un PR

1. Rama desde `main`: `feat/…`, `fix/…`, `chore/…`.
2. `pnpm check` en verde local.
3. PR a `main` con la plantilla llena.
4. CI verde + revisión → merge.

No hay push directo a `main`, `staging` ni `feedback`. El hook lo bloquea.
Nunca `--no-verify`.

## Qué valida

| Dónde       | Qué                                         |
| ----------- | ------------------------------------------- |
| Commit      | eslint + prettier en lo cambiado            |
| Push        | bloquea ramas protegidas                    |
| PR (`ci`)   | lint, prettier, tipos, tests, build de Next |
| PR (`rust`) | `cargo check` + `cargo clippy -D warnings`  |
