<script setup lang="ts">
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
