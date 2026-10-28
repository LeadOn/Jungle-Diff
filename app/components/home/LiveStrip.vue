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
  <div
    v-if="entries.length > 0"
    aria-label="En partie maintenant"
    class="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-3 border border-line bg-surface px-3 py-2.5"
  >
    <span class="inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-[650]">
      <span class="live-dot" aria-hidden="true" />
      En partie
    </span>
    <NuxtLink
      v-for="entry in entries"
      :key="entry.key"
      :to="`/summoner/${entry.playerId}`"
      :title="entry.title"
      class="inline-flex items-center gap-2.5 rounded-2 bg-sunken py-1 pl-1 pr-2.5 text-ink no-underline transition-colors duration-120 ease-out hover:bg-neutral-soft"
    >
      <img :src="entry.iconUrl" alt="" class="size-[30px] shrink-0 rounded-1 object-cover">
      <span class="min-w-0 leading-tight">
        <b class="block truncate text-[13px] font-[640]">{{ entry.name }}</b>
        <span class="block truncate text-xs text-ink-2">{{ entry.champion }}<template v-if="entry.meta"> · {{ entry.meta }}</template></span>
      </span>
      <span class="font-mono text-xs font-semibold tabular-nums text-loss-ink">{{ entry.clock }}</span>
    </NuxtLink>
  </div>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.live-dot {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--loss);
}

.live-dot::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 1.5px solid var(--loss);
  opacity: 0;
  animation: live 2.4s var(--ease-out) infinite;
}

@keyframes live {
  0% {
    opacity: 0.7;
    transform: scale(0.6);
  }
  70%, 100% {
    opacity: 0;
    transform: scale(1.5);
  }
}
</style>
