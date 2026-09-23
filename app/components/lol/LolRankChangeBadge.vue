<template>
  <span class="inline-flex items-center gap-1 whitespace-nowrap" :title="summary">
    <span
      class="rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none"
      :class="deltaClass"
    >
      {{ deltaLabel }}
    </span>

    <!-- The tier tint and emblem are those of the rank reached, so a promotion reads as the new tier. -->
    <span
      v-if="transition"
      class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold leading-none text-text-main"
      :class="transitionBorderClass"
      :style="{ backgroundColor: afterTierBackground }"
      :title="`${transitionPrefix} ${afterLabel} · ${summary}`"
    >
      <Icon :name="transitionIcon" class="h-3 w-3 shrink-0" :class="transitionIconClass" />
      <UiAppImage :src="afterEmblemUrl" alt="" class="h-3.5 w-3.5 shrink-0" />
      <span class="sr-only">{{ transitionPrefix }}</span>
      <span :class="compact ? 'sr-only' : ''">{{ afterLabel }}</span>
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
import { tierEmblemUrl, tierGlowBackground, tierLabel } from '~/utils/lol-tier'

/**
 * LP won or lost on one game. Callers render it only for a non-null `rankChange`: a null one is
 * unknown, and showing it as "0 LP" would state a result the API never measured.
 *
 * `compact` drops the tier name from a promotion/demotion chip — emblem and chevrons stay, the name
 * moves to the tooltip and screen readers — for tight rows like `LolGameCard`, where the full
 * label pushed the item slots out of the card at medium widths.
 */
const props = withDefaults(defineProps<{
  change: LoLGameParticipantRankChange
  compact?: boolean
}>(), {
  compact: false,
})

const deltaLabel = computed(() => formatLpDelta(props.change.leaguePointsChange))
const summary = computed(() => rankChangeSummary(props.change))

const DELTA_CLASSES = {
  gain: 'text-brand-green border-brand-green/45 bg-brand-green/15',
  loss: 'text-brand-red border-brand-red/45 bg-brand-red/15',
  neutral: 'text-text-sec border-border-base bg-white/5 light:bg-black/5',
} as const
const deltaClass = computed(() => DELTA_CLASSES[lpDeltaTone(props.change.leaguePointsChange)])

const transition = computed(() => rankTransition(props.change))
const after = computed(() => rankAfter(props.change))
const afterLabel = computed(() => tierLabel(after.value))
const afterEmblemUrl = computed(() => tierEmblemUrl(after.value))
const afterTierBackground = computed(() => tierGlowBackground(after.value))

const transitionIcon = computed(() =>
  transition.value === 'promotion' ? 'lucide:chevrons-up' : 'lucide:chevrons-down',
)
const transitionIconClass = computed(() =>
  transition.value === 'promotion' ? 'text-brand-green' : 'text-brand-red',
)
const transitionBorderClass = computed(() =>
  transition.value === 'promotion' ? 'border-brand-green/45' : 'border-brand-red/45',
)
const transitionPrefix = computed(() =>
  transition.value === 'promotion' ? 'Promotion en' : 'Rétrogradation en',
)
</script>
