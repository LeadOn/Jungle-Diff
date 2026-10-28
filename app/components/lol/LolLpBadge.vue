<script setup lang="ts">
import { computed } from 'vue'
import { formatLpDelta, lpDeltaTone } from '~/utils/lol-rank-change'

const props = withDefaults(defineProps<{
  value?: number | null
  none?: boolean
  noneLabel?: string
  size?: 'sm' | 'md'
}>(), {
  value: 0,
  none: false,
  noneLabel: 'Sans LP',
  size: 'sm',
})

const toneClass = computed(() => {
  if (props.none) {
    return 'border border-dashed border-line-strong bg-transparent font-sans text-[11px] font-semibold text-ink-2'
  }
  const tone = lpDeltaTone(props.value ?? 0)
  if (tone === 'gain') return 'bg-win-soft text-win-ink font-mono text-[11.5px] font-semibold tabular-nums'
  if (tone === 'loss') return 'bg-loss-soft text-loss-ink font-mono text-[11.5px] font-semibold tabular-nums'
  return 'bg-neutral-soft text-ink-2 font-mono text-[11.5px] font-semibold tabular-nums'
})

const sizeClass = computed(() => (props.size === 'md' ? 'h-[26px] px-2.5' : 'h-[22px] px-[9px]'))

const label = computed(() => {
  if (props.none) return props.noneLabel
  return formatLpDelta(props.value ?? 0)
})
</script>

<template>
  <span
    class="inline-flex items-center rounded-full leading-none whitespace-nowrap"
    :class="[toneClass, sizeClass]"
  >
    <slot>{{ label }}</slot>
  </span>
</template>
