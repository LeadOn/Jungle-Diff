<script setup lang="ts">
/**
 * The API route an action calls, printed in mono under it as the admin mock-up does: the people
 * using this space are the ones who read the API's Swagger.
 */
withDefaults(defineProps<{ onInk?: boolean }>(), { onInk: false })
</script>

<template>
  <span class="font-mono text-[11px] leading-snug font-medium tabular-nums [overflow-wrap:anywhere]" :class="onInk ? 'text-on-night-2' : 'text-ink-2'"><slot /></span>
</template>
