# webtools

Source code of [tanukibox.com](https://tanukibox.com) — a collection of
small web utilities that run **entirely in the browser**. No backend, no
uploads: files never leave the user's device.

## Tools

| Category | Path | Tool | What it does |
|---|---|---|---|
| Image editing | `/convy` | Convy | Convert images between PNG, JPG and WebP |
| Image editing | `/metaimg` | Metaimg | Read, edit or strip EXIF metadata |
| Image editing | `/mochi` | Mochi | Resize images |
| Image editing | `/pixely` | Pixely | Pixelate an image (full or selected area) |
| Documents | `/albumy` | Albumy | Combine several images into a single PDF |
| Documents | `/markpdf` | Markpdf | Add a text watermark to PDF pages |
| Documents | `/metapdf` | Metapdf | Read and edit PDF metadata (title, author, dates…) |
| Documents | `/pdfspinner` | PdfSpinner | Rotate pages of a PDF |
| Documents | `/scissor` | Scissor | Extract pages from a PDF |
| Documents | `/stapler` | Stapler | Merge several PDFs into one |
| Documents | `/wordy` | Wordy | Word/character counter + reading time |
| Privacy | `/createpass` | Createpass | Generate strong passwords |
| Privacy | `/hashy` | Hashy | Hashes (SHA-1/256/384/512) + integrity check |
| Privacy | `/metaimg` | Metaimg | Read, edit or strip EXIF metadata |
| Generators | `/combiny` | Combiny | Combine fields into variants (emails, usernames…) |
| Generators | `/createpass` | Createpass | Generate strong passwords |
| Generators | `/idkun` | Idkun | UUID v4/v7/NIL, ULID, NanoID |
| Generators | `/lorempad` | Lorempad | Lorem ipsum generator |
| Generators | `/qrgen` | Qrgen | QR codes (SVG / PNG, customisable) |
| Development | `/codecpad` | Codecpad | Multi-format encoder (UTF-8, Base64, Base32, Hex, Base58) |
| Development | `/cronpad` | Cronpad | Explain cron expressions + preview next runs |
| Development | `/csvjson` | CsvJson | Convert between CSV and JSON |
| Development | `/diffy` | Diffy | Diff two texts (line / word / char) |
| Development | `/idkun` | Idkun | UUID v4/v7/NIL, ULID, NanoID |
| Development | `/jsonpad` | Jsonpad | Format and validate JSON |
| Development | `/jwtdecoder` | JwtDecoder | Decode JSON Web Tokens |
| Development | `/regexpad` | Regexpad | Test regex and replace text |
| Development | `/urlpad` | Urlpad | URL-encode / decode |
| Development | `/yamljson` | YamlJson | Convert between YAML and JSON |
| Design | `/colory` | Colory | Color picker, palette and WCAG contrast |
| Design | `/gradienty` | Gradienty | CSS gradient generator (linear, radial, conic) |
| Design | `/picky` | Picky | Color eyedropper from an image |
| Design | `/shadowy` | Shadowy | CSS box-shadow generator (multi-layer) |
| Design | `/unity` | Unity | CSS unit converter (px/rem/em/pt/%) |
| Calculators | `/basey` | Basey | Convert between number bases (BigInt) |
| Calculators | `/lapsy` | Lapsy | Time between two dates (live) |
| Calculators | `/timely` | Timely | Convert timestamps and dates |
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
- [`docs/i18n.md`](docs/i18n.md) — how the 25 locales work, vue-i18n
  pitfalls (the `@` and `{}` traps), what to do when adding strings.
- [`docs/conventions.md`](docs/conventions.md) — naming, commit cadence,
  git flow, branding.

## Stack at a glance

- **Nuxt 3 + TypeScript** in SPA mode (`ssr: false`), static-generated to `dist/`.
- **Vue 3** with the Composition API, file-based routing.
- **`@nuxtjs/i18n`** with 25 locales lazy-loaded
  (cs, da, de, el, en, es, fi, fr, hi, hu, id, it, ja, ko, nl, no, pl, pt,
  ro, ru, sv, th, tr, vi, zh).
- **No runtime backend.** Browser APIs (Canvas, Web Crypto, File,
  Web Audio, `Intl`, `BigInt`) + a few small client libraries
  (`pdf-lib`, `piexifjs`, `js-yaml`, `qrcode`, `diff`) do all the work.
- **Netlify** auto-deploys from the `main` branch.

## Branches

| Branch | Role |
|---|---|
| `dev` | Default. All day-to-day work happens here. |
| `main` | Production. Netlify watches it. Only receives fast-forward merges from `dev`, by explicit request. |
