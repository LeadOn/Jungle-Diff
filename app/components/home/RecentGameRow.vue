<script setup lang="ts">
import { computed } from 'vue'
import type { FeedEntry } from '~/utils/lol-feed'
import { RANKED_QUEUE_IDS } from '~/utils/lol-feed'
import { useLolStore } from '~/stores/lol'
import { usePatchStore } from '~/stores/patch'
import { calculateKda, closestDdragonVersion, formatGameDuration, formatQueueShort } from '~/lib/utils/lol'
import { getChampionIconUrl, getItemIconUrl } from '~/utils/ddragon'
import { championDisplayName } from '~/utils/lol-champion'
import { roleLabel } from '~/utils/lol-role'
import { rankAfter, rankChangeSummary, rankTransition } from '~/utils/lol-rank-change'
import { tierEmblemUrl, tierLabel } from '~/utils/lol-tier'
import { playerDisplayName } from '~/utils/lol-ladder'
import { formatClock } from '~/utils/date'
import { formatSigned } from '~/utils/number'

const props = defineProps<{
  entry: FeedEntry
}>()

const store = useLolStore()
const patchStore = usePatchStore()

const game = computed(() => props.entry.game)
const participant = computed(() => props.entry.participant)

const ddragonVersion = computed(() => closestDdragonVersion(game.value.gameVersion, patchStore.availablePatches) || patchStore.currentPatch)

const nameOf = (playerId: number | null, fallback: string) => {
  const player = playerId !== null ? store.players.find(candidate => candidate.id === playerId) : undefined
  return player ? playerDisplayName(player) : fallback
}

const who = computed(() => nameOf(participant.value.playerId, participant.value.riotIdGameName))
const teammatesTitle = computed(() => `Avec ${props.entry.teammates.map(mate => nameOf(mate.playerId, mate.riotIdGameName)).join(', ')}`)

/**
 * The card itself carries the result — an accent bar on the left and a wash fading out towards the
 * right, where the KDA and the LP chip keep a neutral background — so the label is plain text.
 */
const result = computed(() => {
  if (game.value.isRemake) {
    return { label: 'Remake', text: 'text-text-sec', bar: 'bg-border-accent', wash: 'from-surface-high' }
  }
  return participant.value.win
    ? { label: 'Victoire', text: 'text-brand-green', bar: 'bg-win', wash: 'from-win-soft' }
    : { label: 'Défaite', text: 'text-brand-red', bar: 'bg-loss', wash: 'from-loss-soft' }
})

const queueLabel = computed(() => formatQueueShort(game.value.queueId, store.queues))

const clock = computed(() => formatClock(game.value.gameStart))
const duration = computed(() => formatGameDuration(game.value.gameStart, game.value.gameEnd))
const meta = computed(() => [roleLabel(participant.value.teamPosition), queueLabel.value, duration.value].filter(Boolean).join(' · '))

const kda = computed(() => `${participant.value.kills} / ${participant.value.deaths} / ${participant.value.assists}`)
const kdaRatio = computed(() => `${calculateKda(participant.value.kills, participant.value.deaths, participant.value.assists)} KDA`)

const items = computed(() => {
  const p = participant.value
  return [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((id, slot) => ({
    slot,
    url: id ? getItemIconUrl(id, ddragonVersion.value) : '',
  }))
})

/**
 * The LP chip. A known `rankChange` prints its figure, 0 included. A remake or an unranked queue
 * says there were no LP at stake. A ranked game whose LP the API could not pin prints nothing: `null`
 * means unknown, and "Sans LP" there would be a false statement.
 */
const lp = computed(() => {
  const change = participant.value.rankChange
  if (change) {
    const value = change.leaguePointsChange
    return {
      kind: 'known' as const,
      text: `${formatSigned(value)} LP`,
      title: rankChangeSummary(change),
      class: value > 0 ? 'bg-win-soft text-brand-green' : value < 0 ? 'bg-loss-soft text-brand-red' : 'bg-surface-base text-text-main border border-border-accent',
    }
  }
  if (game.value.isRemake) return { kind: 'none' as const, title: 'Remake : aucun LP en jeu' }
  if (game.value.queueId === null || !RANKED_QUEUE_IDS.has(game.value.queueId)) {
    return { kind: 'none' as const, title: 'Partie non classée : aucun LP en jeu' }
  }
  return null
})

const transition = computed(() => {
  const change = participant.value.rankChange
  const direction = change ? rankTransition(change) : null
  if (!change || !direction) return null
  const reached = rankAfter(change)
  return {
    text: `${direction === 'promotion' ? 'Promu' : 'Rétrogradé'} ${tierLabel(reached)}`,
    emblem: tierEmblemUrl(reached),
    class: direction === 'promotion' ? 'bg-win-soft text-brand-green' : 'bg-loss-soft text-brand-red',
  }
})

const championStyle = computed(() => ({
  backgroundImage: `url('${getChampionIconUrl(participant.value.championName, ddragonVersion.value)}')`,
}))
</script>

<template>
  <NuxtLink
    :to="`/game/${game.matchId}/${participant.playerId}`"
    class="group relative grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3.5 overflow-hidden rounded-[20px] border border-border-subtle bg-surface-base bg-linear-to-r to-surface-base to-60% py-3.5 pl-5 pr-3.5 shadow-card transition-[translate,box-shadow] duration-300 ease-spring hover:-translate-y-[3px] hover:shadow-card-hover @min-[600px]:grid-cols-[52px_minmax(0,1fr)_90px_44px_auto]"
    :class="result.wash"
  >
    <span aria-hidden="true" class="absolute inset-y-0 left-0 w-[5px]" :class="result.bar" />
    <span class="relative size-[52px]">
      <span class="absolute inset-0 overflow-hidden rounded-2xl bg-surface-sunken">
        <span class="absolute inset-0 bg-[length:112%] bg-center transition-transform duration-[600ms] ease-out-expo group-hover:scale-[1.15]" :style="championStyle" />
      </span>
      <span class="absolute -bottom-[7px] -right-[7px] flex h-5 min-w-[22px] items-center justify-center rounded-full border border-border-accent bg-surface-base px-1 text-[10.5px] font-bold">{{ participant.champLevel }}</span>
    </span>

    <span class="flex min-w-0 flex-col gap-1">
      <span class="flex min-w-0 items-center gap-2">
        <span class="shrink-0 text-[12px] font-bold uppercase tracking-[0.04em]" :class="result.text">{{ result.label }}</span>
        <span class="min-w-0 truncate text-[15.5px] font-bold">{{ who }}</span>
        <span
          v-if="entry.teammates.length > 0"
          :title="teammatesTitle"
          class="shrink-0 cursor-help rounded-full border border-border-accent px-1.5 text-[11px] font-bold text-text-sec"
        >+{{ entry.teammates.length }}</span>
        <span
          v-if="transition"
          :title="transition.text"
          class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full py-px pl-[3px] pr-[9px] text-[11.5px] font-bold"
          :class="transition.class"
        >
          <img :src="transition.emblem" alt="" class="size-5 object-contain">{{ transition.text }}
        </span>
      </span>
      <span class="truncate text-[12.5px] font-semibold text-text-sec">
        <span class="text-text-main">{{ championDisplayName(participant.championName) }}</span> · {{ meta }}<span class="@min-[600px]:hidden"> · {{ clock }}</span>
      </span>
      <span class="mt-[3px] hidden gap-[3px] @min-[700px]:flex">
        <span
          v-for="item in items"
          :key="item.slot"
          class="size-[22px] shrink-0 rounded-md bg-(--color-item-bg) bg-cover bg-center"
          :class="item.slot === 6 ? 'ml-1' : ''"
          :style="item.url ? { backgroundImage: `url('${item.url}')` } : undefined"
        />
      </span>
    </span>

    <span class="hidden flex-col items-end gap-0.5 @min-[600px]:flex">
      <span class="whitespace-nowrap font-mono text-sm font-semibold">{{ kda }}</span>
      <span class="whitespace-nowrap text-[11.5px] font-semibold text-text-sec">{{ kdaRatio }}</span>
    </span>
    <span class="hidden text-right font-mono text-xs text-text-sec @min-[600px]:block">{{ clock }}</span>

    <span class="flex flex-col items-end gap-[5px]">
      <span class="whitespace-nowrap font-mono text-xs font-semibold @min-[600px]:hidden">{{ kda }}</span>
      <span
        v-if="lp?.kind === 'known'"
        :title="lp.title"
        class="whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-xs font-semibold"
        :class="lp.class"
      >{{ lp.text }}</span>
      <span
        v-else-if="lp?.kind === 'none'"
        :title="lp.title"
        class="cursor-help whitespace-nowrap rounded-full border border-dashed border-border-accent px-2.5 py-1 text-[11.5px] font-bold text-text-sec"
      >Sans LP</span>
    </span>
  </NuxtLink>
</template>
