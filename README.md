# tanukibox-tools

Monorepo de [tanukibox.com](https://tanukibox.com) — colección de utilidades
frontend que se ejecutan en tu navegador, sin servidor.

## Rutas

| Ruta | Herramienta |
|---|---|
| `/` | Landing con listado de herramientas |
| `/mochi` | Redimensiona imágenes |

## Stack

- Nuxt 3 + TypeScript (SPA, `ssr: false`)
- Vue 3 + Vue Router (file-based de Nuxt)
- `@nuxtjs/i18n` (es, en, pt, it, el, ja, zh)
- Deploy: Netlify (build automático desde el repo)

Todo el procesamiento ocurre en el cliente.

## Desarrollo

```bash
npm install
npm run dev
```

## Build estático

```bash
npm run generate
```

Output: `.output/public/`.

## Netlify

| Campo | Valor |
|---|---|
| Build command | `npm run generate` |
| Publish directory | `.output/public` |
| Node version | desde `.nvmrc` (20) |

## Estructura

```
.
├── app.vue                       layout raíz (header + lang switcher + footer)
├── pages/
│   ├── index.vue                 landing
│   └── mochi.vue                 /mochi
├── components/
│   ├── ToolCard.vue              tarjeta de la landing
│   └── ImageResizer.vue
├── composables/
│   └── useImageResize.ts
├── assets/css/main.css
├── i18n/locales/                 es, en, pt, it, el, ja, zh
└── nuxt.config.ts
```

## Añadir una herramienta nueva

1. Crear `pages/<nombre>.vue` con su título y el componente principal.
2. Añadir el componente en `components/`.
3. Si necesita lógica reutilizable, ponerla en `composables/`.
4. Añadir las claves `tools.<nombre>.{name,tagline,description}` a cada locale.
5. Añadir la entrada en el array `tools` de `pages/index.vue`.
