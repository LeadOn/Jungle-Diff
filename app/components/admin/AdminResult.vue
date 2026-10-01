<script setup lang="ts">
/** The outcome of an admin action, printed where it was triggered. */
defineProps<{ tone: 'success' | 'error' }>()
</script>

<template>
  <div
    role="status"
    class="rounded-[14px] px-3.5 py-2.5 text-[13px] font-bold text-pretty"
    :class="tone === 'success' ? 'bg-win-soft text-brand-green' : 'bg-loss-soft text-brand-red'"
  >
    <slot />
  </div>
</template>
