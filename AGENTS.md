<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md

Rules for any agent (Claude, Cursor, etc.) working in this repo.
Read all of it before planning or writing code.

---

## 1. How to write (the most important part)

People reading this repo get tired of long paragraphs. Keep every text short.
Applies to: plans, replies, `.md` files, comments, commits and PRs.

- Short sentences. One idea per line.
- Bullets instead of paragraphs. At most 3 lines of prose in a row.
- Plain words. No jargon when a common word exists.
- Only what matters to decide or act. If it can be deleted without losing anything, delete it.
- Don't repeat what the user said or what the code shows.
- Code comments: only the **why**, never the what. One line if possible.
- The repo is in English: code, comments, tests, docs, commits and PRs.

Examples: `docs/writing-style.md`.

---

## 2. Plans

Every plan follows this format. Nothing else.

```markdown
## What I'll do

- 1-3 bullets

## Why

- 1-2 bullets

## How it will work

1. Flow step
2. Flow step

## Files

- `path/file.ts` → what changes

## Questions

(the open ones, with options)

## Tests

(cases the user picked)
```

Rules:

- **Always ask before deciding** on:
  - Architecture (where logic lives, new table vs column, SQL in `local-db` vs a Rust command).
  - Business (who can do what, what happens in the edge case, what the user sees on failure).
- Every question comes with 2-4 options and a one-line pro/con for each. Mark the recommended one.
- Use the question tool (AskUserQuestion) when it exists.
- If the code answers the question, read the code instead of asking.
- The developer must finish the plan knowing **what** gets done and **why**.

---

## 3. Unit tests

- **jest** only. The file lives next to the code: `my-file.test.ts`.
- **Before writing tests, ask** which cases to test:
  - Propose real edge cases as options (multi-select).
  - The user picks. Only the picked ones get written.
- Don't write tests for:
  - Cases that can't happen (the types already prevent them, the input was validated earlier).
  - Code without logic (components that only render, wrappers, constants).
  - External libraries (Tauri, Next).
- One test = one behavior. The name says what's expected.
  - ✅ `throws 404 when the expense does not exist` · ❌ `test removeExpense case 2`
- No logic inside tests (no `if`, no loops).
- Mocks only at the edge: `getDb`, Tauri's `invoke`.
- Fixed a bug → add a test that fails without the fix.

Agent: `test-planner`. Run: `pnpm test`.

---

## 4. Stack and structure

- Local-first desktop app: **Tauri v2** (macOS + Windows).
- UI: Next.js 16 as a static site (`output: 'export'` → `out/`), React 19, strict TypeScript, **pnpm**.
- Data: local SQLite through `tauri-plugin-sql`. No server, no login, no cloud.
- Structure:
  - `src/app/` → routes. Single-use components live next to their route.
  - `src/components/ui/` → components reused across the app.
  - `src/lib/local-db/` → one file per resource. **The only place with SQL.**
  - `src/lib/api-client/` → what the front calls. Business rules + errors (`ApiClientError`).
  - `src/lib/finance/` → types, validation and pure calculations.
  - `src/lib/i18n/` → every text in the app: `en.ts` (source) and `es.ts`.
  - `src-tauri/` → Rust shell, plugins, permissions (`capabilities/`) and migrations.
- Files in **kebab-case** (`my-component.tsx`). Lint blocks anything else.
- No barrels (an `index.ts` that only re-exports).

---

## 5. Data and permissions

- No auth or roles: one user per computer.
- Data is stored in plain text in the user's SQLite file. It never leaves the machine.
  - Exception: voice with an online key. The spoken text goes to the chosen provider.
  - Keys live only in the OS keychain. Never in SQLite, logs or backups.
- No server at all: no `cookies()`, `headers()`, route handlers or server actions. They break the export.
- Every new Tauri API needs its permission in `src-tauri/capabilities/default.json`. Ask for the minimum.
- Strict CSP in `tauri.conf.json`. Don't open external domains.

Details: `docs/architecture.md` (Data layer, AI and voice).

---

## 6. CSS

- **No Tailwind.** CSS Modules (`file.module.css`) + variables.
- Colors, spacing and fonts come from `src/app/globals.css` through `var(--token)`.
- Literal colors (`#fff`, `rgb()`) only in `globals.css`. Lint and hooks block them anywhere else.
- If a token is missing, ask which one to add. Don't invent it.

---

## 7. Copy and money

- Every text the user sees lives in `src/lib/i18n/en.ts` and `es.ts`. Never in a component.
  - Write the English one first. TypeScript flags a key missing in `es.ts`.
  - Errors travel as codes (`ErrorCode`), in TS and Rust. Only the UI turns them into text.
- Money is integer **cents**, for every currency. Format it with `money()` from `usePreferences()`.
  - Never divide by 100 or format amounts by hand in a component.

---

## 8. Database

- Schema change = a new file in `src-tauri/migrations/` (`0004_name.sql`) + register it in `src-tauri/src/lib.rs` with the next version.
- Never edit a merged migration, not even a comment.
  - It already ran on users' machines.
  - sqlx checks each migration's checksum: a changed file stops existing databases from opening.
- If the data shape changes, review export/import (`src/lib/local-db/backup.ts`) and bump `BACKUP_VERSION` if needed.
- Test with `pnpm desktop`: a new database and an existing one.

---

## 9. Git

- Protected branches: `main`, `staging`, `feedback`. **Never push directly.** Branch + PR.
- **Never** skip hooks: no `--no-verify`, `-n`, `HUSKY=0`.
- If a hook fails, fix the error. Don't work around it.

---

## 10. Banned

- Tailwind or any CSS utility library.
- `any`. Use the real type or `unknown` + validation.
- `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`.
- npm, yarn, bun, npx. Only pnpm (`pnpm dlx` instead of `npx`).
- Editing `.env*` or lockfiles by hand.
- Adding libraries without asking.
- Features, abstractions or error handling nobody asked for.

The hooks in `.claude/hooks/` block almost all of this. If a hook blocks you: **don't try to work around it**. Fix the problem or ask.

---

## 11. Definition of done

A task is NOT done if any of this fails:

```bash
pnpm check   # lint + prettier + types + tests + build + cargo check
```

When you finish, reply in this format (short):

```markdown
**What changed:** 1-2 lines for product.
**Technical details:** 2-4 bullets.
**How to test:** steps: what to run, what to open, what you should see.
```
