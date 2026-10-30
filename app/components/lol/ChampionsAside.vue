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
  <UiPanel title="Champions" title-id="profile-champions" :meta="badge">
    <p v-if="champs.length === 0" class="type-small m-0 px-4 pb-4 text-ink-2">Aucun champion joué sur cette période.</p>
    <div v-else>
      <div
        v-for="c in visibleChamps"
        :key="c.key"
        class="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-4 py-2.5"
      >
        <span class="size-10 rounded-2 bg-sunken bg-[length:112%] bg-center" :style="c.iconStyle" />
        <span class="grid min-w-0 gap-px">
          <b class="truncate text-[0.875rem] font-[640] text-ink">{{ c.name }}</b>
          <span class="truncate text-[0.75rem] text-ink-3">
            <span class="font-mono tabular-nums">{{ c.kda }}</span> · {{ c.games }}
          </span>
          <span class="mt-1.5 block h-1.5 overflow-hidden rounded-[2px] bg-neutral-soft">
            <span
              class="block h-full rounded-[2px] transition-[width] duration-[600ms] ease-out"
              :class="c.winRate >= 50 ? 'bg-win' : 'bg-loss'"
              :style="{ width: `${entered ? c.winRate : 0}%` }"
            />
          </span>
        </span>
        <span
          class="w-12 text-right font-mono text-[13px] font-semibold tabular-nums"
          :class="c.winRate >= 50 ? 'text-win-ink' : 'text-loss-ink'"
        >{{ c.winRate }}%</span>
      </div>
      <div v-if="hiddenCount > 0" class="border-t border-line p-2">
        <UiButton
          variant="quiet"
          size="sm"
          block
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Réduire' : hiddenCount > 1 ? `Voir les ${hiddenCount} autres` : 'Voir le dernier' }}
        </UiButton>
      </div>
    </div>
  </UiPanel>
</template>
