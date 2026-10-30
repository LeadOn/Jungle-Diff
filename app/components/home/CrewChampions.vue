<script setup lang="ts">
import { computed } from 'vue'
import type { LoLCrewChampionStatDto } from '~/lib/types'
import { usePatchStore } from '~/stores/patch'
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

const rows = computed(() => props.champions.slice(0, 4).map((champion) => {
  const top = champion.topPlayer
  const topName = top ? playerDisplayName(top.player) : null
  const winRate = Math.round(champion.winRate)
  return {
    key: champion.championName,
    name: championDisplayName(champion.championName),
    iconUrl: getChampionIconUrl(champion.championName, patchStore.currentPatch),
    mainTitle: top ? `Surtout ${topName} · ${top.gamesPlayed} partie${top.gamesPlayed > 1 ? 's' : ''} sur ${champion.gamesPlayed}` : undefined,
    mainIconUrl: top?.player.lolIconId != null
      ? getProfileIconUrl(top.player.lolIconId, patchStore.currentPatch)
      : null,
    sub: [
      topName ? `surtout ${topName}` : null,
      `${champion.gamesPlayed} partie${champion.gamesPlayed > 1 ? 's' : ''}`,
      `${formatDecimal(champion.kda)} KDA`,
    ].filter(Boolean).join(' · '),
    winRateNum: winRate,
    winRate: formatPercent(winRate),
    winRateClass: winRate >= 50 ? 'text-win-ink' : 'text-loss-ink',
  }
}))
</script>

<template>
  <UiPanel
    v-if="rows.length > 0"
    title="Champions du crew"
    heading-tag="h3"
    meta="30 jours"
  >
    <div v-for="row in rows" :key="row.key" class="list-row champ-row">
      <span class="champ">
        <img :src="row.iconUrl" alt="">
        <img
          v-if="row.mainIconUrl"
          class="by"
          :src="row.mainIconUrl"
          alt=""
          :title="row.mainTitle"
        >
      </span>
      <span class="list-main">
        <b>{{ row.name }}</b>
        <span :title="row.mainTitle">{{ row.sub }}</span>
        <span class="split" role="img" :aria-label="`${row.winRateNum} % de victoires`">
          <i :style="{ width: `${row.winRateNum}%` }" />
        </span>
      </span>
      <span class="wr" :class="row.winRateClass">{{ row.winRate }}</span>
    </div>
  </UiPanel>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.list-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 48px;
  gap: 12px;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid var(--line);
}

.champ {
  position: relative;
  flex: none;
  width: 40px;
  height: 40px;
}

.champ > img:first-child {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-2);
  object-fit: cover;
  background: var(--sunken);
}

.champ .by {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 0 2px var(--surface);
}

.list-main {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.list-main b {
  font-weight: 640;
  font-size: 0.875rem;
}

.list-main > span:not(.split) {
  font-size: 0.75rem;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.split {
  display: flex;
  height: 6px;
  margin-top: 6px;
  border-radius: 2px;
  overflow: hidden;
  background: var(--loss);
}

.split i {
  display: block;
  height: 100%;
  background: var(--win);
}

.wr {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
