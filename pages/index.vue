<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

const categoriesRaw = [
  { id: 'imageEdit', tools: ['mochi', 'metaimg', 'convy', 'pixely'] },
  { id: 'documents', tools: ['stapler', 'scissor', 'pdfspinner', 'albumy', 'metapdf', 'wordy'] },
  { id: 'privacy', tools: ['metaimg', 'createpass', 'hashy'] },
  { id: 'generators', tools: ['createpass', 'idkun', 'combiny', 'lorempad', 'qrgen'] },
  { id: 'dev', tools: ['csvjson', 'jsonpad', 'regexpad', 'yamljson', 'urlpad', 'codecpad', 'jwtdecoder', 'diffy', 'idkun'] },
  { id: 'design', tools: ['gradienty', 'shadowy', 'colory', 'unity'] },
  { id: 'calculators', tools: ['timely', 'basey', 'lapsy'] },
] as const

const toolPaths: Record<string, string> = {
  mochi: '/mochi',
  metaimg: '/metaimg',
  convy: '/convy',
  pixely: '/pixely',
  createpass: '/createpass',
  hashy: '/hashy',
  idkun: '/idkun',
  stapler: '/stapler',
  scissor: '/scissor',
  pdfspinner: '/pdfspinner',
  albumy: '/albumy',
  metapdf: '/metapdf',
  wordy: '/wordy',
  combiny: '/combiny',
  csvjson: '/csvjson',
  jsonpad: '/jsonpad',
  lorempad: '/lorempad',
  qrgen: '/qrgen',
  regexpad: '/regexpad',
  yamljson: '/yamljson',
  urlpad: '/urlpad',
  codecpad: '/codecpad',
  jwtdecoder: '/jwtdecoder',
  diffy: '/diffy',
  gradienty: '/gradienty',
  shadowy: '/shadowy',
  colory: '/colory',
  unity: '/unity',
  timely: '/timely',
  basey: '/basey',
  lapsy: '/lapsy',
}

const categories = computed(() =>
  categoriesRaw.map((cat) => ({
    id: cat.id,
    tools: [...cat.tools].sort((a, b) =>
      t(`tools.${a}.name`).localeCompare(t(`tools.${b}.name`), locale.value),
    ),
  })),
)

useHead({
  meta: [{ name: 'description', content: () => t('landing.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('landing.title') }}</h1>
      <p class="lead">{{ t('landing.description') }}</p>
    </header>

    <section
      v-for="cat in categories"
      :key="cat.id"
      class="category"
    >
      <h2 class="category-title">{{ t(`landing.categories.${cat.id}`) }}</h2>
      <div class="tool-grid">
        <ToolCard
          v-for="toolId in cat.tools"
          :key="toolId"
          :to="localePath(toolPaths[toolId])"
          :name="t(`tools.${toolId}.name`)"
          :tagline="t(`tools.${toolId}.tagline`)"
        />
      </div>
    </section>
  </section>
</template>

<style scoped>
.category {
  margin-top: 2rem;
}
.category:first-of-type {
  margin-top: 0;
}
.category-title {
  margin: 0 0 0.85rem;
  font-size: 1rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.5rem;
}
</style>
