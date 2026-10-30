<script setup lang="ts">
import { computed } from 'vue'

export type UiStatusVariant = 'me' | 'smurf' | 'archived' | 'live' | 'plus'

const props = defineProps<{
  variant: UiStatusVariant
  label?: string
}>()

const defaultLabels: Record<UiStatusVariant, string> = {
  me: 'Vous',
  smurf: 'Smurf',
  archived: 'Archivé',
  live: 'En partie',
  plus: '',
}

const variantClasses: Record<UiStatusVariant, string> = {
  me: 'bg-gold text-on-tier font-[650]',
  smurf: 'border border-line-strong text-ink-2 font-[650]',
  archived: 'bg-neutral-soft text-ink-3 font-[650]',
  live: 'bg-loss-soft text-loss-ink font-[650]',
  plus: 'border border-line-strong text-ink-2 font-mono font-medium',
}

const resolvedLabel = computed(() => props.label ?? defaultLabels[props.variant])
</script>

<template>
  <span
    class="inline-flex h-5 items-center gap-[5px] rounded-1 px-1.5 text-[11px] leading-none whitespace-nowrap"
    :class="variantClasses[variant]"
  >
    <span
      v-if="variant === 'live'"
      aria-hidden="true"
      class="h-1.5 w-1.5 shrink-0 rounded-full bg-loss"
    />
    <slot>{{ resolvedLabel }}</slot>
  </span>
</template>
