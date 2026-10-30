<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  panel?: boolean
}>(), {
  description: undefined,
  panel: true,
})
</script>

<template>
  <div
    class="grid justify-items-start gap-2 p-[22px]"
    :class="panel ? 'min-w-0 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface shadow-card' : ''"
  >
    <p class="type-title text-[1rem] text-ink">
      <slot name="title">{{ title }}</slot>
    </p>
    <p v-if="description || $slots.default" class="max-w-[46ch] text-[0.875rem] text-ink-2">
      <slot>{{ description }}</slot>
    </p>
    <div v-if="$slots.actions" class="mt-1">
      <slot name="actions" />
    </div>
  </div>
</template>
