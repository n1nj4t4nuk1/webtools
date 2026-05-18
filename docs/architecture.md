# Architecture

## High-level shape

```
Browser
  └── Nuxt 3 SPA (ssr: false)
        ├── Vue 3 + Composition API
        ├── @nuxtjs/i18n (25 locales, lazy-loaded JSON)
        └── Per-tool composable + component + page

Static hosting (Netlify) serves dist/ — that's the whole runtime.
```

Every tool is **fully client-side**. There is no backend, no database, no
serverless functions. The user's files are processed in their own browser
using:

- **Canvas API** — Mochi (resize), Convy (format conversion), Pixely
  (pixelate), Picky (color eyedropper), Albumy (image-to-PDF rendering).
- **Web Crypto** — Hashy (digests), Createpass (random), Idkun (UUID
  v4/v7/NIL, ULID, NanoID).
- **File API + `ArrayBuffer`** — every tool that takes a file.
- **`pdf-lib`** — Stapler (merge), Scissor (split), PdfSpinner (rotate),
  Albumy (image-to-PDF), Metapdf (metadata), Markpdf (watermark).
- **`piexifjs`** — Metaimg (EXIF read/write).
- **`js-yaml`** — YamlJson (YAML ↔ JSON).
- **`qrcode`** — Qrgen (QR codes, SVG/PNG).
- **`diff`** — Diffy (text diff: line / word / char).
- **`Intl` + `BigInt`** — Timely, Lapsy, Basey, Codecpad.

This is the **load-bearing constraint of the whole project**: any new tool
proposal must answer "can this run entirely client-side?" first. If it
needs a server, it doesn't belong here.

## Folder layout

```
.
├── app.vue                 Root layout: header (brand + lang switcher) + footer
├── nuxt.config.ts          Nuxt + i18n config, output to dist/
├── netlify.toml            Build command + Node 20
├── public/
│   ├── _redirects          SPA fallback: /* /index.html 200
│   └── favicon.ico
├── assets/css/main.css     Global CSS variables, layout, .card, .btn, etc.
├── pages/                  File-based routing — one file per route
│   ├── index.vue           Landing with categorised tool grid
│   ├── <tool>.vue          One page per tool, hosts the component
│   ├── privacy.vue
│   ├── terms.vue
│   └── cookies.vue
├── components/
│   ├── ToolCard.vue        Card used in the landing grid
│   └── <Tool>.vue          One component per tool (the actual UI)
├── composables/
│   └── use<Tool>.ts        One composable per tool (pure logic)
├── i18n/locales/           One JSON file per language
│   ├── es.json  (default)
│   ├── en.json
│   ├── pt.json
│   ├── it.json
│   ├── el.json
│   ├── ja.json
│   └── zh.json
└── docs/                   This documentation
```

## Per-tool pattern

Each tool is a **trio**:

```
composables/use<Tool>.ts   ← pure functions, no Vue, no DOM
components/<Tool>.vue      ← UI: inputs, refs, computed, event handlers
pages/<tool>.vue           ← thin wrapper: page header + useHead + <Tool />
```

The composable contains **the logic**, the component contains **the
state and events**, the page contains **the route**. This split is what
makes tools easy to test, swap and read.

See [`docs/adding-a-tool.md`](adding-a-tool.md) for a worked example.

## Landing page

`pages/index.vue` declares the catalog in a single source of truth:

```ts
const categoriesRaw = [
  { id: 'imageEdit',  tools: ['mochi', 'metaimg'] },
  { id: 'documents',  tools: ['stapler', 'scissor', 'wordy'] },
  { id: 'privacy',    tools: ['metaimg', 'createpass', 'hashy'] },
  { id: 'generators', tools: ['createpass', 'idkun', 'combiny', 'lorempad'] },
  { id: 'dev',        tools: ['csvjson', 'jsonpad', 'regexpad', 'idkun'] },
]

const toolPaths: Record<string, string> = {
  mochi: '/mochi',
  metaimg: '/metaimg',
  /* …one entry per tool… */
}
```

- A tool can live in **more than one category** (e.g. Idkun is in both
  Generators and Development). Just list it in both arrays.
- The visible name comes from i18n (`tools.<id>.name`), and inside each
  category the list is **re-sorted alphabetically by translated name** at
  runtime. This keeps the order coherent in every language.

## Code splitting and lazy loading

- Nuxt automatically code-splits per route. Loading `/mochi` only
  downloads Mochi's chunk plus the shared vendor.
- Heavy single-use libraries should be `import()`ed dynamically inside
  the composable if possible — keeps the landing page snappy. Currently
  `pdf-lib`, `piexifjs`, `js-yaml`, `qrcode` and `diff` are imported
  statically; all are small enough that it doesn't matter.
- The 25 locale JSON files are lazy-loaded by `@nuxtjs/i18n` (`lazy: true`).

## Routing and i18n strategy

`@nuxtjs/i18n` uses **`prefix_except_default`** with `es` as default:

- `/mochi` — Spanish (no prefix)
- `/en/mochi` — English
- `/pt/mochi`, `/it/mochi`, `/el/mochi`, `/ja/mochi`, `/zh/mochi`

The language switcher in `app.vue` writes a `tanukibox_lang` cookie so
the choice persists across visits. `detectBrowserLanguage.redirectOn:
'root'` means we only redirect from `/`, never from a deep link.

## Style system

A handful of CSS variables in `assets/css/main.css` drive the whole look:

```css
:root {
  --bg:          #f6f3ee;   /* page background */
  --surface:     #ffffff;   /* cards, header */
  --ink:         #1f1b16;   /* primary text */
  --muted:       #6b6258;   /* secondary text */
  --accent:      #c75a3a;   /* brand orange */
  --accent-soft: #f1d3c5;
  --border:      #e3ddd2;
  --radius:      10px;
  --max-w:       880px;
}
```

Reusable classes (`.card`, `.btn`, `.btn-ghost`, `.field`, `.dropzone`,
`.tool-grid`, `.tool-card`) are global. Tool-specific styles live in
scoped `<style>` blocks inside the component.

The brand in the header is the literal **"TanukiBox WebTools"**:
TanukiBox in the accent colour, WebTools in muted, side by side without
a separator.

## What the project deliberately doesn't have

- No state management library (Pinia, Vuex) — each tool's state lives in
  its own component refs.
- No CSS framework (Tailwind, UnoCSS) — plain CSS with variables is
  enough at this scale.
- No backend, no auth, no analytics, no tracking cookies. The only
  cookie is `tanukibox_lang`.
- No test suite yet. Typechecking via `vue-tsc` is the only static
  guardrail. If/when tests are added they will go under `tests/`.
- No tokenized design system — see `main.css` for the full styling
  surface area.
