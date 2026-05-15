// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-01',

  ssr: false,

  devtools: { enabled: true },

  modules: ['@nuxtjs/i18n'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      title: 'Tanukibox',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'Colección de utilidades web que se ejecutan en tu navegador. Sin servidor, sin subidas.',
        },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  nitro: {
    output: {
      publicDir: 'dist',
    },
  },

  i18n: {
    defaultLocale: 'es',
    strategy: 'prefix_except_default',
    lazy: true,
    locales: [
      { code: 'es', name: 'Español', file: 'es.json' },
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'pt', name: 'Português', file: 'pt.json' },
      { code: 'it', name: 'Italiano', file: 'it.json' },
      { code: 'el', name: 'Ελληνικά', file: 'el.json' },
      { code: 'ja', name: '日本語', file: 'ja.json' },
      { code: 'zh', name: '中文', file: 'zh.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'tanukibox_lang',
      redirectOn: 'root',
    },
  },
})
