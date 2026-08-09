<template>
  <div class="bg-surface-base rounded-2xl p-6 border border-border-base animate-fade-in-up">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-[14px] font-extrabold text-text-main">{{ title }}</h3>
      <span v-if="badge" class="font-mono text-[10px] font-bold bg-surface-high text-text-main px-2 py-0.5 rounded border border-border-subtle tracking-[0.1em] uppercase">{{ badge }}</span>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  badge?: string
}>()
</script>
