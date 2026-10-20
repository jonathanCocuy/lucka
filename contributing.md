# Contributing

## Key rules

Full list in [`AGENTS.md`](AGENTS.md). The ones people forget:

- Short text. Code comments explain **why**, never what.
- **pnpm** only (`pnpm dlx`, never `npx`).
- No Tailwind, `any`, `eslint-disable` or `@ts-ignore`.
- Files in kebab-case. No barrel files.
- Colors only as tokens from `src/app/globals.css`.
- SQL only in `src/lib/local-db/`.
- New dependency → ask in an issue first.

How the app works: [`docs/architecture.md`](docs/architecture.md).

## Opening a PR

1. Branch from `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
2. `pnpm check` passes locally.
3. PR to `main` with the template filled in.
4. Green CI + review → merge.

No direct pushes to `main`, `staging` or `feedback`. A hook blocks them.
Never use `--no-verify`.

## What gets checked

| Where              | What                                                        |
| ------------------ | ----------------------------------------------------------- |
| Commit             | ESLint + Prettier on changed files                          |
| Push               | Blocks protected branches                                   |
| PR (`check`)       | Lint, Prettier, types, tests, Next build                    |
| PR (`rust`)        | `cargo check` + `cargo clippy -D warnings`                  |
| PR (`build-check`) | Real macOS + Windows build and launch (native changes only) |
