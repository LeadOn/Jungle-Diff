<script setup lang="ts">
import { computed } from 'vue'
import type { RankPosition } from '~/utils/lol-tier'
import { tierEmblemUrl, tierLabel } from '~/utils/lol-tier'

const props = withDefaults(defineProps<{
  rank?: Partial<RankPosition> | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  iconOnly?: boolean
  showLp?: boolean
  stacked?: boolean
}>(), {
  rank: null,
  size: 'md',
  iconOnly: false,
  showLp: false,
  stacked: false,
})

const hasRank = computed(() => Boolean(props.rank?.tier))
const emblemUrl = computed(() => tierEmblemUrl(hasRank.value ? { tier: props.rank!.tier! } : null))
const label = computed(() => tierLabel(hasRank.value ? { tier: props.rank!.tier!, rank: props.rank?.rank ?? '' } : null))

const sizeClasses = {
  sm: 'h-5 w-5',
  md: 'h-[26px] w-[26px]',
  lg: 'h-8 w-8',
  xl: 'h-14 w-14',
} as const
</script>

<template>
  <span class="inline-flex min-w-0 items-center gap-1.5">
    <UiAppImage
      :src="emblemUrl"
      alt=""
      class="shrink-0 object-contain"
      :class="[sizeClasses[size], !hasRank ? 'opacity-45 grayscale' : '']"
    />
    <template v-if="!iconOnly">
      <span v-if="stacked" class="min-w-0">
        <b
          class="block whitespace-nowrap text-[0.875rem]"
          :class="hasRank ? 'font-[650] text-ink' : 'font-[520] text-ink-3'"
        >{{ label }}</b>
        <span
          v-if="hasRank && showLp && rank?.leaguePoints !== undefined"
          class="block whitespace-nowrap font-mono text-[11px] text-ink-3"
        >{{ rank.leaguePoints }} LP</span>
      </span>
      <template v-else>
        <b
          class="whitespace-nowrap text-[0.8125rem]"
          :class="hasRank ? 'font-[620] text-ink' : 'font-[520] text-ink-3'"
        >{{ label }}</b>
        <span
          v-if="hasRank && showLp && rank?.leaguePoints !== undefined"
          class="whitespace-nowrap font-mono text-[11px] text-ink-3"
        >{{ rank.leaguePoints }} LP</span>
      </template>
    </template>
  </span>
</template>

