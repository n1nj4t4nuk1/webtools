<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.idkun.name')} · Tanukibox`,
  meta: [
    { name: 'description', content: () => t('tools.idkun.description') },
  ],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.idkun.tagline') }}</h1>
      <p class="lead">{{ t('tools.idkun.description') }}</p>
    </header>

    <IdGenerator />
  </section>
</template>
