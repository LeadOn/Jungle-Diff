<template>
  <span class="inline-flex items-center gap-1.5 whitespace-nowrap" :title="summary">
    <span
      class="inline-flex h-[22px] items-center rounded-full px-[9px] font-mono text-[11.5px] font-semibold leading-none tabular-nums"
      :class="deltaClass"
    >
      {{ deltaLabel }}
    </span>

    <!-- The tier tint and emblem are those of the rank reached, so a promotion reads as the new tier. -->
    <span
      v-if="transition"
      class="inline-flex h-[22px] items-center gap-1 rounded-1 pr-2 pl-0.5 text-[11.5px] font-[650] leading-none text-ink"
      :style="{ backgroundColor: afterPromoBackground }"
      :title="`${transitionPrefix} ${afterLabel} · ${summary}`"
    >
      <Icon :name="transitionIcon" class="h-3 w-3 shrink-0" :class="transitionIconClass" />
      <UiAppImage :src="afterEmblemUrl" alt="" class="h-5 w-5 shrink-0" />
      <span class="sr-only">{{ transitionPrefix }}</span>
      <span>{{ afterLabel }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantRankChange } from '~/lib/types'
import {
  formatLpDelta,
  lpDeltaTone,
  rankAfter,
  rankChangeSummary,
  rankTransition,
} from '~/utils/lol-rank-change'
import { tierEmblemUrl, tierLabel, tierTint } from '~/utils/lol-tier'

/**
 * LP won or lost on one game. Callers render it only for a non-null `rankChange`: a null one is
 * unknown, and showing it as "0 LP" would state a result the API never measured.
 */
const props = defineProps<{
  change: LoLGameParticipantRankChange
}>()

const deltaLabel = computed(() => formatLpDelta(props.change.leaguePointsChange))
const summary = computed(() => rankChangeSummary(props.change))

const DELTA_CLASSES = {
  gain: 'bg-win-soft text-win-ink',
  loss: 'bg-loss-soft text-loss-ink',
  neutral: 'bg-neutral-soft text-ink-2 light:bg-neutral-soft',
} as const
const deltaClass = computed(() => DELTA_CLASSES[lpDeltaTone(props.change.leaguePointsChange)])

const transition = computed(() => rankTransition(props.change))
const after = computed(() => rankAfter(props.change))
const afterLabel = computed(() => tierLabel(after.value))
const afterEmblemUrl = computed(() => tierEmblemUrl(after.value))
const afterPromoBackground = computed(() => {
  const tint = tierTint(after.value.tier) ?? 'var(--color-tier-emerald)'
  return `color-mix(in oklch, ${tint} 32%, var(--surface))`
})

const transitionIcon = computed(() =>
  transition.value === 'promotion' ? 'lucide:chevrons-up' : 'lucide:chevrons-down',
)
const transitionIconClass = computed(() =>
  transition.value === 'promotion' ? 'text-win-ink' : 'text-loss-ink',
)
const transitionPrefix = computed(() =>
  transition.value === 'promotion' ? 'Promu' : 'Rétrogradé',
)
</script>
