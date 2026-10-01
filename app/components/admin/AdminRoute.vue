<script setup lang="ts">
/**
 * The API route an action calls, printed in mono under it as the admin mock-up does: the people
 * using this space are the ones who read the API's Swagger.
 */
withDefaults(defineProps<{ onInk?: boolean }>(), { onInk: false })
</script>

<template>
  <span class="font-mono text-[10.5px] leading-snug" :class="onInk ? 'text-on-photo-green' : 'text-text-sec'"><slot /></span>
</template>
