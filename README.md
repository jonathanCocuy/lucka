# Lucka

Cuánto tengo disponible y en qué se me va el dinero.
App de escritorio para macOS y Windows. Tus datos nunca salen de tu computador.

<!-- Captura: docs/screenshot.png -->

## Descargar

[juan-ramirez-dev.github.io/lucka-landing](https://juan-ramirez-dev.github.io/lucka-landing/)

- Sin firma de Apple/Windows: la primera vez el sistema avisa. La landing explica cómo abrirla.
- Se actualiza sola al abrir.

## Cómo funciona

- Mes financiero: de día de pago a día de pago.
- **Disponible** = ingreso − gastado − fijos pendientes.
- Gasto → va a un fijo (lo marca pagado) o a una categoría (cuenta contra su presupuesto).
- Aporte a inversiones = gasto fijo "Inversión".
- Respaldo: Ajustes → Exportar / Importar (JSON).

## Desarrollo

Necesitas:

- Node 20 y pnpm.
- Rust estable.
- macOS: Xcode Command Line Tools (`xcode-select --install`).
- Windows: Microsoft C++ Build Tools + WebView2.

```bash
pnpm install
pnpm desktop   # abre la app con recarga en vivo
```

| Script               | Qué hace                                               |
| -------------------- | ------------------------------------------------------ |
| `pnpm desktop`       | app en modo desarrollo                                 |
| `pnpm desktop:build` | instalador local en `src-tauri/target/release/bundle/` |
| `pnpm check`         | lint + prettier + tipos + tests + build + cargo check  |

## Publicar

1. Subir `version` en `src-tauri/tauri.conf.json` (y en `package.json`, `Cargo.toml`).
2. PR → CI verde → merge a `main`.
3. GitHub Actions crea el Release con los instaladores.

Detalle: `docs/ci-cd.md`.

## Docs

- `AGENTS.md` → reglas (humanos y agentes)
- `contributing.md` → cómo aportar
- `docs/data.md` → SQLite, ruta del archivo, formato del respaldo
- `docs/ci-cd.md` → CI, releases y auto-update
- `docs/css.md` → tokens y estilos
- `docs/testing.md` → qué y cómo probar

## Licencia

MIT
