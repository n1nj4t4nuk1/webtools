<script setup lang="ts">
defineProps<{
  icon: string
  name: string
  tagline: string
  to: string
}>()
</script>

<template>
  <NuxtLink :to="to" class="tool-card">
    <span class="tool-card-icon" aria-hidden="true">{{ icon }}</span>
    <span class="tool-card-name">{{ name }}</span>
    <p class="tool-card-tagline">{{ tagline }}</p>
  </NuxtLink>
</template>
