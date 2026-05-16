# webtools

Monorepo de [tanukibox.com](https://tanukibox.com) — colección de utilidades
frontend que se ejecutan en tu navegador, sin servidor. Todo el procesamiento
ocurre en el cliente: tus archivos nunca salen del dispositivo.

## Herramientas

| Categoría | Ruta | Herramienta | Descripción |
|---|---|---|---|
| Edición de imágenes | `/mochi` | Mochi | Redimensiona imágenes |
| Edición de imágenes | `/metaimg` | Metaimg | Lee, edita o elimina metadatos EXIF |
| Documentos | `/stapler` | Stapler | Une varios PDFs en uno |
| Documentos | `/scissor` | Scissor | Extrae páginas de un PDF |
| Documentos | `/wordy` | Wordy | Cuenta palabras, caracteres y tiempo de lectura |
| Privacidad | `/createpass` | Createpass | Genera contraseñas seguras |
| Privacidad | `/hashy` | Hashy | Calcula hashes (SHA-1/256/384/512) y verifica integridad |
| Generadores | `/idkun` | Idkun | UUID v4/v7/NIL, ULID, NanoID |
| Generadores | `/combiny` | Combiny | Combina campos en variantes (emails, usernames, slugs) |
| Generadores | `/lorempad` | Lorempad | Genera texto Lorem ipsum |
| Desarrollo | `/csvjson` | CsvJson | Convierte entre CSV y JSON |
| Desarrollo | `/jsonpad` | Jsonpad | Formatea y valida JSON |
| Legal | `/privacy` `/terms` `/cookies` | — | Páginas legales |

## Stack

- Nuxt 3 + TypeScript (SPA, `ssr: false`)
- Vue 3 + Vue Router (file-based de Nuxt)
- `@nuxtjs/i18n` (es, en, pt, it, el, ja, zh)
- `pdf-lib` para Stapler y Scissor
- `piexifjs` para Metaimg
- Web Crypto API para Hashy / Createpass / Idkun
- Canvas API para Mochi
- Deploy: Netlify (build automático desde el repo)

## Desarrollo

```bash
npm install
npm run dev
```

## Build estático

```bash
npm run generate
```

Output: `dist/` (configurado en `nuxt.config.ts`).

## Ramas

| Rama | Rol |
|---|---|
| `dev` | Default. Desarrollo diario. |
| `main` | Producción. Netlify la observa para desplegar. Sólo recibe merges desde `dev`. |

## Netlify

| Campo | Valor |
|---|---|
| Branch to deploy | `main` |
| Build command | `npm run generate` |
| Publish directory | `dist` |
| Node version | desde `netlify.toml` (20) |

## Estructura

```
.
├── app.vue                       layout raíz (header + lang switcher + footer)
├── pages/                        rutas (una por herramienta + legal)
├── components/                   un componente por herramienta + ToolCard
├── composables/                  lógica reutilizable (use*.ts)
├── assets/css/main.css
├── public/_redirects             SPA fallback para Netlify
├── i18n/locales/                 es, en, pt, it, el, ja, zh
├── netlify.toml                  build + Node 20
└── nuxt.config.ts
```

## Añadir una herramienta nueva

1. Crear `composables/use<Nombre>.ts` con la lógica pura.
2. Crear `components/<Nombre>.vue` con la UI.
3. Crear `pages/<nombre>.vue` que monte el componente y use `useHead`.
4. Añadir las claves `tools.<nombre>.{name,tagline,description}` y el bloque
   con los strings de UI en los 7 locales de `i18n/locales/`.
5. Registrar la entrada en `categoriesRaw` y en `toolPaths` de
   `pages/index.vue` (categoría adecuada; la lista se ordena alfabéticamente
   por nombre traducido en runtime).
