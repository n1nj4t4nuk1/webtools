# webtools

Source code of [tanukibox.com](https://tanukibox.com) — a collection of
small web utilities that run **entirely in the browser**. No backend, no
uploads: files never leave the user's device.

## Tools

| Category | Path | Tool | What it does |
|---|---|---|---|
| Image editing | `/mochi` | Mochi | Resize images |
| Image editing | `/metaimg` | Metaimg | Read, edit or strip EXIF metadata |
| Documents | `/stapler` | Stapler | Merge several PDFs into one |
| Documents | `/scissor` | Scissor | Extract pages from a PDF |
| Documents | `/wordy` | Wordy | Word/character counter + reading time |
| Privacy | `/createpass` | Createpass | Generate strong passwords |
| Privacy | `/hashy` | Hashy | Hashes (SHA-1/256/384/512) + integrity check |
| Generators | `/idkun` | Idkun | UUID v4/v7/NIL, ULID, NanoID |
| Generators | `/combiny` | Combiny | Combine fields into variants (emails, usernames…) |
| Generators | `/lorempad` | Lorempad | Lorem ipsum generator |
| Development | `/csvjson` | CsvJson | Convert between CSV and JSON |
| Development | `/jsonpad` | Jsonpad | Format and validate JSON |
| Development | `/regexpad` | Regexpad | Test regex and replace text |
| Legal | `/privacy` `/terms` `/cookies` | — | Legal pages |

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm run generate # static build → dist/
```

## Documentation

The `docs/` folder contains everything you need to start contributing or to
brief an LLM on the project:

- [`docs/getting-started.md`](docs/getting-started.md) — local setup, dev,
  build, deploy.
- [`docs/architecture.md`](docs/architecture.md) — stack, folder layout,
  why decisions were made.
- [`docs/adding-a-tool.md`](docs/adding-a-tool.md) — step-by-step guide to
  add a new tool from scratch.
- [`docs/i18n.md`](docs/i18n.md) — how the 7 locales work, vue-i18n
  pitfalls (the `@` and `{}` traps), what to do when adding strings.
- [`docs/conventions.md`](docs/conventions.md) — naming, commit cadence,
  git flow, branding.

## Stack at a glance

- **Nuxt 3 + TypeScript** in SPA mode (`ssr: false`), static-generated to `dist/`.
- **Vue 3** with the Composition API, file-based routing.
- **`@nuxtjs/i18n`** with 7 locales (es, en, pt, it, el, ja, zh).
- **No runtime backend.** Browser APIs (Canvas, Web Crypto, File) + a few
  small client libraries (`pdf-lib`, `piexifjs`) do all the work.
- **Netlify** auto-deploys from the `main` branch.

## Branches

| Branch | Role |
|---|---|
| `dev` | Default. All day-to-day work happens here. |
| `main` | Production. Netlify watches it. Only receives fast-forward merges from `dev`, by explicit request. |
