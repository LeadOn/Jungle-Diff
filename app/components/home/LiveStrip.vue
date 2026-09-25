<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { LoLLiveGameDto } from '~/lib/types'
import { useLolStore } from '~/stores/lol'
import { usePatchStore } from '~/stores/patch'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { AppError, isAbortError } from '~/lib/types/error'
import { formatQueueShort } from '~/lib/utils/lol'
import { getChampionIconUrl } from '~/utils/ddragon'
import { championDisplayName } from '~/utils/lol-champion'
import { playerDisplayName } from '~/utils/lol-ladder'

/**
 * "En partie maintenant", from `GET /lol/live` (Riot's spectator-v5 behind a one-minute server
 * cache).
 *
 * Client-side only, on purpose: `/` is served from a shared 60 s SWR cache, and a live strip baked
 * into that HTML would add a minute of staleness to the API's own. It polls at the API's cache pace,
 * skips a tick while the tab is hidden, and renders nothing while nobody is in game.
 */

const props = withDefaults(defineProps<{
  /** Same roster flag as the rest of the dashboard. */
  includeSmurfs?: boolean
}>(), { includeSmurfs: false })

const POLL_MS = 60_000

const store = useLolStore()
const patchStore = usePatchStore()

const games = ref<LoLLiveGameDto[]>([])
const now = ref(Date.now())
let poller: ReturnType<typeof setInterval> | undefined
let ticker: ReturnType<typeof setInterval> | undefined
let request: AbortController | null = null

const load = async () => {
  request?.abort()
  request = new AbortController()
  try {
    games.value = (await useGameOnLol().getLiveGames(props.includeSmurfs, request.signal)) ?? []
  } catch (error) {
    if (isAbortError(error)) return
    // An API build without the route (older than 2026-09) answers 404 at every tick: stop asking.
    if (error instanceof AppError && error.statusCode === 404) {
      clearInterval(poller)
      return
    }
    // Decorative: on failure the strip keeps what it last showed, or stays hidden.
    console.error('[home] Parties en cours indisponibles:', error)
  }
}

onMounted(() => {
  load()
  poller = setInterval(() => { if (!document.hidden) load() }, POLL_MS)
  ticker = setInterval(() => { now.value = Date.now() }, 1000)
})

// Both intervals die with the component, or they keep hitting the API for a destroyed view.
onBeforeUnmount(() => {
  clearInterval(poller)
  clearInterval(ticker)
  request?.abort()
})

watch(() => props.includeSmurfs, () => load())

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

const entries = computed(() => games.value.map((game) => {
  const name = playerDisplayName(game.player)
  // Crew members sharing the game, told apart by side.
  const mates = games.value.filter(other => other.gameId === game.gameId && other.player.id !== game.player.id)
  const withNames = mates.filter(mate => mate.teamId === game.teamId).map(mate => playerDisplayName(mate.player))
  const againstNames = mates.filter(mate => mate.teamId !== game.teamId).map(mate => playerDisplayName(mate.player))
  const company = [
    withNames.length ? `avec ${withNames.join(', ')}` : '',
    againstNames.length ? `contre ${againstNames.join(', ')}` : '',
  ].filter(Boolean).join(' · ')

  // `gameLengthSeconds` was true at `retrievedOn`; the counter runs on from there.
  const elapsed = game.gameStart
    ? Math.max(0, Math.floor(game.gameLengthSeconds + (now.value - new Date(game.retrievedOn).getTime()) / 1000))
    : null

  return {
    key: `${game.gameId}-${game.player.id}`,
    playerId: game.player.id,
    name,
    champion: game.championName ? championDisplayName(game.championName) : 'Champion récent',
    // A champion too recent for the API's referential has no name, hence no Data Dragon file:
    // CommunityDragon serves icons by id.
    iconUrl: game.championName
      ? getChampionIconUrl(game.championName, patchStore.currentPatch)
      : `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${game.championId}.png`,
    meta: [formatQueueShort(game.queueId, store.queues), company].filter(Boolean).join(' · '),
    clock: elapsed === null ? 'Chargement' : clock(elapsed),
    title: `${name}${company ? ` ${company}` : ''}`,
  }
}))
</script>

<template>
  <!-- `relative` on purpose: the bento's cards above are positioned, so their shadows paint over any
       plain block below them. Positioned and later in the page, the strip paints over the shadows. -->
  <div
    v-if="entries.length > 0"
    class="relative mt-4 flex animate-rise flex-wrap items-center gap-x-5 gap-y-3 rounded-[22px] border border-border-subtle bg-surface-base py-2.5 pl-[18px] pr-3 shadow-card"
  >
    <span class="inline-flex items-center gap-2.5 whitespace-nowrap text-[13.5px] font-bold">
      <span class="relative size-2.5">
        <span class="absolute inset-0 animate-ping-slow rounded-full bg-loss" />
        <span class="absolute inset-0 rounded-full bg-loss" />
      </span>
      En partie maintenant
    </span>
    <div class="flex flex-1 flex-wrap gap-2.5">
      <NuxtLink
        v-for="entry in entries"
        :key="entry.key"
        :to="`/summoner/${entry.playerId}`"
        :title="entry.title"
        class="flex items-center gap-2.5 rounded-full border border-border-subtle bg-surface-muted py-[5px] pl-[5px] pr-1.5 transition-[background-color,translate] duration-300 ease-spring hover:-translate-y-0.5 hover:bg-surface-high"
      >
        <span
          class="size-9 shrink-0 rounded-full bg-surface-sunken bg-[length:115%] bg-center shadow-[0_0_0_2px_var(--color-surface),0_0_0_3.5px_var(--color-loss-fill)]"
          :style="{ backgroundImage: `url('${entry.iconUrl}')` }"
        />
        <span class="flex min-w-0 flex-col gap-px">
          <span class="whitespace-nowrap text-sm font-bold">{{ entry.name }} <span class="font-semibold text-text-sec">· {{ entry.champion }}</span></span>
          <span class="whitespace-nowrap text-xs font-semibold text-text-sec">{{ entry.meta }}</span>
        </span>
        <span class="ml-2 rounded-full bg-loss-soft px-[9px] py-1 font-mono text-xs font-semibold text-brand-red">{{ entry.clock }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
