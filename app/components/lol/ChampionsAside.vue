<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePatchStore } from '~/stores/patch'
import { useEntered } from '~/composables/useEntered'
import { getChampionIconUrl } from '~/utils/ddragon'
import { championDisplayName } from '~/utils/lol-champion'
import type { LoLSummonerPerformanceStats } from '~/lib/types'

type Period = '7j' | '30j' | 'all-time'

const props = defineProps<{
  period: Period
  stats: LoLSummonerPerformanceStats | null
}>()

const patchStore = usePatchStore()
const entered = useEntered()

const PERIOD_BADGE: Record<Period, string> = { '7j': '7 j', '30j': '30 j', 'all-time': 'Toujours' }

const badge = computed(() => PERIOD_BADGE[props.period])

// The API lists every champion played over the period; the rail shows the first few, on demand the rest.
const COLLAPSED_COUNT = 5
const expanded = ref(false)

const champs = computed(() => (props.stats?.championStats ?? []).map(c => ({
  key: c.championName,
  name: championDisplayName(c.championName),
  iconStyle: { backgroundImage: `url('${getChampionIconUrl(c.championName, patchStore.currentPatch)}')` },
  kda: `${c.kda.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} KDA`,
  winRate: Math.round(c.winRate),
  games: `${c.gamesPlayed} partie${c.gamesPlayed > 1 ? 's' : ''}`,
})))
const visibleChamps = computed(() => (expanded.value ? champs.value : champs.value.slice(0, COLLAPSED_COUNT)))
const hiddenCount = computed(() => champs.value.length - COLLAPSED_COUNT)
</script>

<template>
  <section aria-labelledby="profile-champions" class="rounded-3xl border border-border-subtle bg-surface-base p-[18px] shadow-card">
    <div class="flex items-baseline justify-between gap-2">
      <h3 id="profile-champions" class="m-0 text-xl font-bold tracking-[-0.025em]">Champions</h3>
      <span class="text-[12.5px] font-semibold text-text-sec">{{ badge }}</span>
    </div>
    <p v-if="champs.length === 0" class="mb-1 mt-2.5 text-[13px] font-bold text-text-sec">Aucun champion joué sur cette période.</p>
    <div v-else class="mt-1.5">
      <div v-for="c in visibleChamps" :key="c.key" class="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
        <span class="size-11 rounded-[14px] bg-surface-sunken bg-[length:112%] bg-center" :style="c.iconStyle" />
        <span class="min-w-0">
          <span class="flex items-baseline justify-between gap-2">
            <span class="truncate text-[14.5px] font-bold">{{ c.name }}</span>
            <span class="whitespace-nowrap text-[11.5px] font-semibold text-text-sec">{{ c.kda }}</span>
          </span>
          <span class="mt-[7px] block h-1.5 overflow-hidden rounded-full bg-surface-high">
            <span
              class="block h-full rounded-full transition-[width] duration-[1100ms] ease-spring-soft"
              :class="c.winRate >= 50 ? 'bg-win' : 'bg-loss'"
              :style="{ width: `${entered ? c.winRate : 0}%` }"
            />
          </span>
        </span>
        <span class="flex flex-col items-end gap-px">
          <span class="text-base font-bold" :class="c.winRate >= 50 ? 'text-brand-green' : 'text-brand-red'">{{ c.winRate }}%</span>
          <span class="whitespace-nowrap text-[11px] font-semibold text-text-sec">{{ c.games }}</span>
        </span>
      </div>
      <button
        v-if="hiddenCount > 0"
        type="button"
        :aria-expanded="expanded"
        class="mt-1 w-full cursor-pointer rounded-full border border-border-base py-2 text-[12.5px] font-bold transition-colors duration-200 hover:bg-surface-muted"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Réduire' : hiddenCount > 1 ? `Voir les ${hiddenCount} autres` : 'Voir le dernier' }}
      </button>
    </div>
  </section>
</template>
