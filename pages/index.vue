<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

const tools = [
  { id: 'mochi', icon: '🖼️', to: '/mochi' },
] as const

useHead({
  title: () => `Tanukibox · ${t('landing.title')}`,
  meta: [{ name: 'description', content: () => t('landing.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('landing.title') }}</h1>
      <p class="lead">{{ t('landing.description') }}</p>
    </header>

    <div class="tool-grid">
      <ToolCard
        v-for="tool in tools"
        :key="tool.id"
        :icon="tool.icon"
        :to="localePath(tool.to)"
        :name="t(`tools.${tool.id}.name`)"
        :tagline="t(`tools.${tool.id}.tagline`)"
      />
    </div>
  </section>
</template>
