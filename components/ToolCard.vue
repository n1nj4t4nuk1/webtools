<script setup lang="ts">
/**
 * ToolCard.vue
 *
 * Presentational card used by the landing grid: shows a tool's display
 * name and tagline, links to its route and is the building block of the
 * categorized lists in `pages/index.vue`. Stateless — every value comes
 * from props so the same card can serve translated copies in every locale.
 */
defineProps<{
  name: string
  tagline: string
  to: string
}>()
</script>

<template>
  <NuxtLink :to="to" class="tool-card">
    <span class="tool-card-name">{{ name }}</span>
    <p class="tool-card-tagline">{{ tagline }}</p>
  </NuxtLink>
</template>
