<template>
  <span class="inline-flex items-center gap-1.5 whitespace-nowrap" :title="summary">
    <LolLpBadge :value="change.leaguePointsChange" />

    <!-- The tier tint and emblem are those of the rank reached, so a promotion reads as the new tier. -->
    <span
      v-if="transition"
      class="inline-flex h-[22px] items-center gap-1 rounded-1 bg-[color-mix(in_oklch,var(--tier,var(--tier-none))_32%,var(--surface))] pr-2 pl-0.5 text-[11.5px] font-[650] leading-none text-ink"
      :style="{ '--tier': afterTint }"
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
  rankAfter,
  rankChangeSummary,
  rankTransition,
} from '~/utils/lol-rank-change'
import { tierEmblemUrl, tierLabel, tierTint } from '~/utils/lol-tier'
import LolLpBadge from '~/components/lol/LolLpBadge.vue'

/**
 * LP won or lost on one game. Callers render it only for a non-null `rankChange`: a null one is
 * unknown, and showing it as "0 LP" would state a result the API never measured.
 */
const props = defineProps<{
  change: LoLGameParticipantRankChange
}>()

const summary = computed(() => rankChangeSummary(props.change))

const transition = computed(() => rankTransition(props.change))
const after = computed(() => rankAfter(props.change))
const afterLabel = computed(() => tierLabel(after.value))
const afterEmblemUrl = computed(() => tierEmblemUrl(after.value))
// Read by the chip's background through `--tier`; an unknown tier falls back to `--tier-none`.
const afterTint = computed(() => tierTint(after.value.tier) ?? undefined)

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
