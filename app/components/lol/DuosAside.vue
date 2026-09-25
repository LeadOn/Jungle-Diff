<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePatchStore } from '~/stores/patch'
import { getProfileIconUrl } from '~/utils/ddragon'
import { playerDisplayName } from '~/utils/lol-ladder'
import type { LoLSummonerPerformanceStats } from '~/lib/types'

type Period = '7j' | '30j' | 'all-time'

const props = defineProps<{
  period: Period
  stats: LoLSummonerPerformanceStats | null
}>()

const patchStore = usePatchStore()

const PERIOD_BADGE: Record<Period, string> = { '7j': '7 j', '30j': '30 j', 'all-time': 'Toujours' }

const badge = computed(() => PERIOD_BADGE[props.period])

// Same rule as the champions: the first few, the rest on demand.
const COLLAPSED_COUNT = 5
const expanded = ref(false)

const duos = computed(() => (props.stats?.duoStats ?? []).map(d => ({
  id: d.player.id,
  name: playerDisplayName(d.player),
  iconUrl: d.player.lolIconId != null ? getProfileIconUrl(d.player.lolIconId, patchStore.currentPatch) : null,
  games: `${d.gamesPlayed} partie${d.gamesPlayed > 1 ? 's' : ''} ensemble`,
  winRate: Math.round(d.winRate),
})))
const visibleDuos = computed(() => (expanded.value ? duos.value : duos.value.slice(0, COLLAPSED_COUNT)))
const hiddenCount = computed(() => duos.value.length - COLLAPSED_COUNT)
</script>

<template>
  <section aria-labelledby="profile-duos">
    <div class="mb-3.5 flex items-baseline justify-between gap-3">
      <h3 id="profile-duos" class="m-0 text-xl font-bold tracking-[-0.025em]">Duos</h3>
      <span class="text-[12.5px] font-semibold text-text-sec">{{ badge }}</span>
    </div>
    <div
      v-if="duos.length === 0"
      class="rounded-[18px] border-[1.5px] border-dashed border-border-dashed p-[18px] text-[13px] font-bold text-text-sec"
    >
      Aucun duo suivi sur cette période.
    </div>
    <div v-else class="flex flex-col gap-2.5">
      <NuxtLink
        v-for="d in visibleDuos"
        :key="d.id"
        :to="`/summoner/${d.id}`"
        class="flex items-center gap-3 rounded-[18px] border border-border-subtle bg-surface-base px-3.5 py-3 shadow-card transition-transform duration-300 ease-spring hover:translate-x-1"
      >
        <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken bg-cover bg-center" :style="d.iconUrl ? { backgroundImage: `url('${d.iconUrl}')` } : undefined">
          <Icon v-if="!d.iconUrl" name="lucide:user" class="size-4 text-text-ter" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[14.5px] font-bold">{{ d.name }}</span>
          <span class="mt-0.5 block text-xs font-semibold text-text-sec">{{ d.games }}</span>
        </span>
        <span class="shrink-0 text-[28px] font-bold tracking-[-0.04em]" :class="d.winRate >= 50 ? 'text-brand-green' : 'text-brand-red'">{{ d.winRate }}%</span>
      </NuxtLink>
      <button
        v-if="hiddenCount > 0"
        type="button"
        :aria-expanded="expanded"
        class="w-full cursor-pointer rounded-full border border-border-base bg-surface-base py-2 text-[12.5px] font-bold transition-colors duration-200 hover:bg-surface-muted"
        @click="expanded = !expanded"
      >
        {{ expanded ? 'Réduire' : hiddenCount > 1 ? `Voir les ${hiddenCount} autres` : 'Voir le dernier' }}
      </button>
    </div>
  </section>
</template>
