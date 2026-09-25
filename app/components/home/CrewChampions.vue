<script setup lang="ts">
import { computed } from 'vue'
import type { LoLCrewChampionStatDto } from '~/lib/types'
import { usePatchStore } from '~/stores/patch'
import { useEntered } from '~/composables/useEntered'
import { getChampionIconUrl, getProfileIconUrl } from '~/utils/ddragon'
import { championDisplayName } from '~/utils/lol-champion'
import { playerDisplayName } from '~/utils/lol-ladder'
import { formatDecimal, formatPercent } from '~/utils/number'

/**
 * `crewRecords.topChampions` (rolling 30 days), each with the account that played it the most
 * (`topPlayer`, per account: a main and its smurf compete separately when smurfs are included).
 */
const props = defineProps<{
  champions: LoLCrewChampionStatDto[]
}>()

const patchStore = usePatchStore()
const entered = useEntered()

const rows = computed(() => props.champions.slice(0, 4).map((champion) => {
  const top = champion.topPlayer
  const topName = top ? playerDisplayName(top.player) : null
  const winRate = Math.round(champion.winRate)
  return {
    key: champion.championName,
    name: championDisplayName(champion.championName),
    iconStyle: { backgroundImage: `url('${getChampionIconUrl(champion.championName, patchStore.currentPatch)}')` },
    mainName: top ? `surtout ${topName}` : null,
    mainTitle: top ? `${topName} · ${top.gamesPlayed} partie${top.gamesPlayed > 1 ? 's' : ''} sur ${champion.gamesPlayed}` : undefined,
    mainIconStyle: top?.player.lolIconId != null
      ? { backgroundImage: `url('${getProfileIconUrl(top.player.lolIconId, patchStore.currentPatch)}')` }
      : {},
    meta: `${champion.gamesPlayed} partie${champion.gamesPlayed > 1 ? 's' : ''} · ${formatDecimal(champion.kda)} KDA`,
    winRate: formatPercent(winRate),
    winRateClass: winRate >= 50 ? 'text-brand-green' : 'text-brand-red',
    barStyle: { width: `${entered.value ? winRate : 0}%` },
  }
}))
</script>

<template>
  <section v-if="rows.length > 0" aria-labelledby="crew-champions-title" class="rounded-3xl border border-border-subtle bg-surface-base p-[18px] shadow-card">
    <h3 id="crew-champions-title" class="text-xl font-bold tracking-[-0.025em]">Champions du crew</h3>
    <p class="mb-1.5 mt-[3px] text-[12.5px] font-semibold text-text-sec">30 derniers jours</p>
    <div v-for="row in rows" :key="row.key" class="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
      <span class="relative size-11">
        <span class="absolute inset-0 rounded-[14px] bg-surface-sunken bg-[length:112%] bg-center" :style="row.iconStyle" />
        <span
          v-if="row.mainName"
          :title="row.mainTitle"
          class="absolute -bottom-[5px] -right-[5px] size-5 rounded-full border-2 border-surface-base bg-surface-sunken bg-cover bg-center"
          :style="row.mainIconStyle"
        />
      </span>
      <span class="min-w-0">
        <span class="flex items-baseline justify-between gap-2">
          <span class="shrink-0 text-[14.5px] font-bold">{{ row.name }}</span>
          <span v-if="row.mainName" class="min-w-0 truncate text-[11.5px] font-semibold text-text-sec" :title="row.mainTitle">{{ row.mainName }}</span>
        </span>
        <span class="block text-[11.5px] font-semibold text-text-sec">{{ row.meta }}</span>
        <span class="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-loss-track">
          <span class="block h-full rounded-full bg-win transition-[width] duration-[1100ms] ease-spring-soft" :style="row.barStyle" />
        </span>
      </span>
      <span class="text-base font-bold" :class="row.winRateClass">{{ row.winRate }}</span>
    </div>
  </section>
</template>
