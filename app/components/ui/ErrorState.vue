<script setup lang="ts">
defineProps<{
  title: string
  description?: string
  retryLabel?: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <div
    role="alert"
    class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3.5 rounded-3 border border-[color-mix(in_oklch,var(--loss)_45%,var(--line))] bg-surface p-[18px]"
  >
    <img
      src="~/assets/img/JungleDiff_Logo.png"
      alt=""
      class="h-12 w-12 shrink-0 object-contain grayscale-50"
    >
    <div class="min-w-0">
      <p class="type-title text-ink">
        <slot name="title">{{ title }}</slot>
      </p>
      <p v-if="description || $slots.default" class="mt-0.5 text-[0.875rem] text-ink-2">
        <slot>{{ description }}</slot>
      </p>
      <div v-if="retryLabel || $slots.actions" class="mt-2.5">
        <slot name="actions">
          <UiButton variant="primary" size="sm" @click="$emit('retry')">
            {{ retryLabel }}
          </UiButton>
        </slot>
      </div>
    </div>
  </div>
</template>
