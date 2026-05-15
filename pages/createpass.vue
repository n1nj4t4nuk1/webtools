<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.createpass.name')} · Tanukibox`,
  meta: [
    { name: 'description', content: () => t('tools.createpass.description') },
  ],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.createpass.tagline') }}</h1>
      <p class="lead">{{ t('tools.createpass.description') }}</p>
    </header>

    <PasswordGenerator />
  </section>
</template>
