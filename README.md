# Lucka

**How much money do I have left, and where is it going?**

A personal finance desktop app for macOS and Windows.
Local-first: your data lives in one file on your computer. No account, no server, no cloud.

[![Voice entry: say what you spent, Lucka writes it down, you confirm before saving](docs/media/demo-voice-en.gif)](docs/media/demo-voice-en.mp4)

_Voice entry in four steps. [Full-quality MP4](docs/media/demo-voice-en.mp4) (1080p, 21 s) · [En español](docs/media/demo-voice-es.mp4)._

## Download

[juan-ramirez-dev.github.io/lucka-landing](https://juan-ramirez-dev.github.io/lucka-landing/)

- Builds are not signed by Apple or Microsoft, so the OS warns on first launch. The landing page explains how to open it.
- The app updates itself.

## Features

- **Pay-cycle budgeting.** The month runs from payday to payday, not calendar month.
- **English or Spanish, dollars or pesos.** Picked on first launch. Dollars keep their cents.
- **Available balance** = income − spent − fixed expenses still pending.
- **Fixed expenses and budget categories.** Every expense pays a fixed expense or counts against a category.
- **Voice entry.** Say _"yesterday I spent $4.50 on coffee and paid the internet"_ and review the records before saving.
  - Speech-to-text always runs on your machine (Whisper), in the app's language.
  - Interpretation runs locally (Qwen via llama.cpp) or with your own OpenAI / Anthropic / Gemini key.
- **Customizable dashboard.** Drag, resize and hide widgets.
- **Backups.** Export and import everything as JSON.

## Architecture in two minutes

[![Lucka architecture: layers, why JS and Rust, where data lives, voice + local AI, native builds, CI](docs/architecture-video/lucka-architecture.gif)](docs/architecture-video/lucka-architecture.mp4)

_Preview. [Full video](docs/architecture-video/lucka-architecture.mp4) (1080p, 2:15, narrated): why JavaScript, why Rust, where the data lives, the voice pipeline with local AI, native builds and CI._

## Tech stack

| Layer    | Tech                                                                             |
| -------- | -------------------------------------------------------------------------------- |
| UI       | Next.js 16 (static export), React 19, TypeScript (strict), CSS Modules           |
| Desktop  | Tauri v2, Rust                                                                   |
| Data     | SQLite via `tauri-plugin-sql`, SQL migrations                                    |
| AI       | whisper.cpp, llama.cpp (GBNF-constrained JSON), OpenAI / Anthropic / Gemini APIs |
| Security | OS keychain for API keys, strict CSP, least-privilege Tauri permissions          |
| Quality  | ESLint (with custom rules), Prettier, Jest, Husky, Clippy                        |
| CI/CD    | GitHub Actions: checks, real cross-platform builds, signed auto-updates          |
| Dev      | Claude Code with project hooks, agents and skills                                |

## Engineering highlights

- **Web app → native app.** Ported a Next.js + Supabase app to a local-first desktop app, keeping the UI's data API identical so components barely changed.
- **Database-enforced rules.** CHECK constraints and partial unique indexes guarantee invariants like "an expense targets exactly one thing" and "only one active investment".
- **Optimistic UI with rollback.** Actions run through a promise queue: the screen updates instantly and reverts if the write fails.
- **One schema, four AI backends.** The same JSON schema drives OpenAI/Anthropic/Gemini structured outputs and a grammar-constrained local LLM.
- **Untrusted AI output.** Model answers are validated and mapped to real ids in pure, tested TypeScript before the user confirms anything.
- **Verified model downloads.** Multi-GB models stream to disk with pinned SHA-256 hashes and progress events.
- **Native packaging.** Solved a ggml symbol clash by shipping llama.cpp as dynamic libraries, merged into universal macOS binaries with `lipo`.
- **Guardrails in three layers.** The same conventions are enforced by Claude Code hooks, git hooks and CI, so neither humans nor agents can skip them.
- **Release automation.** Merge with a new version → draft release → parallel macOS/Windows builds → publish → installed apps auto-update.

Full write-up: [`docs/architecture.md`](docs/architecture.md).

## Development

Requirements:

- Node 20 and pnpm.
- Rust stable.
- macOS: Xcode Command Line Tools (`xcode-select --install`).
- Windows: Microsoft C++ Build Tools + WebView2.

```bash
pnpm install
pnpm desktop   # opens the app with live reload
```

| Script               | Does                                                    |
| -------------------- | ------------------------------------------------------- |
| `pnpm desktop`       | App in dev mode                                         |
| `pnpm desktop:build` | Local installer in `src-tauri/target/release/bundle/`   |
| `pnpm test`          | Unit tests                                              |
| `pnpm check`         | Lint + Prettier + types + tests + build + `cargo check` |

## Docs

- [`docs/architecture.md`](docs/architecture.md) → how everything works and why.
- [`AGENTS.md`](AGENTS.md) → project rules for humans and AI agents.
- [`contributing.md`](contributing.md) → how to open a PR.

## License

MIT
