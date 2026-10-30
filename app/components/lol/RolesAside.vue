<script setup lang="ts">
import { computed } from 'vue'
import type { LoLSummonerPerformanceStats } from '~/lib/types'
import { useEntered } from '~/composables/useEntered'
import { roleIconUrl } from '~/utils/lol-role'

type Period = '7j' | '30j' | 'all-time'

const props = defineProps<{
  period: Period
  stats: LoLSummonerPerformanceStats | null
}>()

const entered = useEntered()

const PERIOD_BADGE: Record<Period, string> = { '7j': '7 j', '30j': '30 j', 'all-time': 'Toujours' }

const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Milieu',
  BOTTOM: 'ADC',
  UTILITY: 'Support',
}

const badge = computed(() => PERIOD_BADGE[props.period])

const roles = computed(() => (props.stats?.roleStats ?? []).map(r => ({
  key: r.teamPosition,
  label: ROLE_LABELS[r.teamPosition] ?? r.teamPosition,
  icon: roleIconUrl(r.teamPosition),
  playRate: Math.round(r.playRate),
  winRate: Math.round(r.winRate),
})))
</script>

<template>
  <UiPanel title="Rôles" title-id="profile-roles" :meta="badge">
    <p v-if="roles.length === 0" class="type-small m-0 px-4 pb-4 text-ink-2">Aucun rôle connu sur cette période.</p>
    <div v-else class="flex flex-col gap-3.5 border-t border-line px-4 pt-3 pb-4">
      <div v-for="r in roles" :key="r.key" class="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2.5">
        <span class="flex size-7 items-center justify-center rounded-full bg-sunken">
          <img v-if="r.icon" :src="r.icon" alt="" class="size-3.5 opacity-75 brightness-0 dark:invert">
        </span>
        <span class="flex min-w-0 flex-col gap-1.5">
          <span class="flex items-baseline justify-between gap-2">
            <span class="text-[0.875rem] font-[640] text-ink">{{ r.label }} <span class="font-mono text-[12px] font-medium tabular-nums text-ink-3">· {{ r.playRate }}&#8239;%</span></span>
            <span class="whitespace-nowrap font-mono text-[12px] font-semibold tabular-nums" :class="r.winRate >= 50 ? 'text-win-ink' : 'text-loss-ink'">{{ r.winRate }}&#8239;% WR</span>
          </span>
          <span class="block h-1.5 overflow-hidden rounded-[2px] bg-neutral-soft">
            <span
              class="block h-full rounded-[2px] bg-canopy transition-[width] duration-[600ms] ease-out"
              :style="{ width: `${entered ? r.playRate : 0}%` }"
            />
          </span>
        </span>
      </div>
    </div>
  </UiPanel>
</template>
