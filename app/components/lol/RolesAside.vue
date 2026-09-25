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
  <section aria-labelledby="profile-roles" class="rounded-3xl border border-border-subtle bg-surface-base p-[18px] shadow-card">
    <div class="mb-3.5 flex items-baseline justify-between gap-2">
      <h3 id="profile-roles" class="m-0 text-xl font-bold tracking-[-0.025em]">Rôles</h3>
      <span class="text-[12.5px] font-semibold text-text-sec">{{ badge }}</span>
    </div>
    <p v-if="roles.length === 0" class="m-0 text-[13px] font-bold text-text-sec">Aucun rôle connu sur cette période.</p>
    <div v-else class="flex flex-col gap-3.5">
      <div v-for="r in roles" :key="r.key" class="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-2.5">
        <span class="flex size-7 items-center justify-center rounded-full bg-surface-muted">
          <img v-if="r.icon" :src="r.icon" alt="" class="size-3.5 opacity-75 brightness-0 dark:invert">
        </span>
        <span class="flex min-w-0 flex-col gap-1.5">
          <span class="flex items-baseline justify-between gap-2">
            <span class="text-sm font-bold">{{ r.label }} <span class="font-semibold text-text-sec">· {{ r.playRate }}&#8239;%</span></span>
            <span class="whitespace-nowrap text-[12.5px] font-bold" :class="r.winRate >= 50 ? 'text-brand-green' : 'text-brand-red'">{{ r.winRate }}&#8239;% WR</span>
          </span>
          <span class="block h-2 overflow-hidden rounded-full bg-surface-high">
            <span
              class="block h-full rounded-full bg-brand-gold-bright transition-[width] duration-[1100ms] ease-spring-soft"
              :style="{ width: `${entered ? r.playRate : 0}%` }"
            />
          </span>
        </span>
      </div>
    </div>
  </section>
</template>
