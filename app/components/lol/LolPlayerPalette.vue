<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { navigateTo, useRoute } from '#app'
import type { LeaguePlayer } from '~/lib/types'
import { useLolStore } from '~/stores/lol'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { usePatchStore } from '~/stores/patch'
import { usePlayerPalette } from '~/composables/usePlayerPalette'
import { filterPlayersByName, normalizeSearchText } from '~/utils/player-search'
import { compareRanksDesc } from '~/utils/lol-tier'
import { isSmurf } from '~/utils/lol-smurf'
import { getProfileIconUrl } from '~/utils/ddragon'
import { isAbortError } from '~/lib/types/error'

/**
 * Crew search, opened from the header, the mobile bar, ⌘K / Ctrl K or "/".
 *
 * The GameOn API has no search by name, so candidates are resolved locally against the crew list
 * (`useLolStore().players`), loaded on first opening when the current page did not need it.
 */

type PaletteItem =
  | { kind: 'player', key: string, href: string, player: LeaguePlayer }
  | { kind: 'action', key: string, href: string, label: string }

const { isOpen, open, close, toggle } = usePlayerPalette()
const store = useLolStore()
const authStore = useAuthStore()
const playerStore = usePlayerStore()
const patchStore = usePatchStore()
const route = useRoute()

const query = ref('')
const activeIndex = ref(0)
const input = ref<HTMLInputElement | null>(null)
const isLoading = ref(false)
const loadFailed = ref(false)
let loadRequest: AbortController | null = null

const rankedPlayers = computed(() => [...store.players].sort((a, b) => {
  const rankA = a.leagueOfLegendsSoloRank
  const rankB = b.leagueOfLegendsSoloRank
  if (!rankA || !rankB) return (rankA ? -1 : 0) + (rankB ? 1 : 0)
  return compareRanksDesc(rankA, rankB)
}))

const matchingPlayers = computed(() => filterPlayersByName(rankedPlayers.value, query.value))

const matchingActions = computed(() => {
  const actions = [{ key: 'records', label: 'Voir tous les records', href: '/stats' }]
  if (authStore.isAuthenticated) actions.push({ key: 'settings', label: 'Paramètres du compte', href: '/settings' })
  const needle = normalizeSearchText(query.value)
  return needle ? actions.filter(action => normalizeSearchText(action.label).includes(needle)) : actions
})

const items = computed<PaletteItem[]>(() => [
  ...matchingPlayers.value.map(player => ({ kind: 'player' as const, key: `player-${player.id}`, href: `/summoner/${player.id}`, player })),
  ...matchingActions.value.map(action => ({ kind: 'action' as const, ...action })),
])

const playerItems = computed(() => items.value.filter((item): item is Extract<PaletteItem, { kind: 'player' }> => item.kind === 'player'))
const actionItems = computed(() => items.value.filter((item): item is Extract<PaletteItem, { kind: 'action' }> => item.kind === 'action'))

const countLabel = computed(() => {
  const count = playerItems.value.length
  return `${count} joueur${count > 1 ? 's' : ''}`
})

const optionId = (index: number) => `player-palette-option-${index}`

const playerName = (player: LeaguePlayer) => player.riotGamesNickname || player.nickname
const playerTag = (player: LeaguePlayer) => (player.riotGamesTagLine ? `#${player.riotGamesTagLine}` : '')
const iconUrl = (player: LeaguePlayer) => (player.lolIconId != null ? getProfileIconUrl(player.lolIconId, patchStore.currentPatch) : null)
const isMe = (player: LeaguePlayer) => playerStore.currentPlayer?.id === player.id

const loadPlayers = async () => {
  if (store.players.length > 0) return
  loadRequest?.abort()
  loadRequest = new AbortController()
  isLoading.value = true
  loadFailed.value = false
  try {
    await store.fetchPlayers(loadRequest.signal)
  } catch (error) {
    if (!isAbortError(error)) {
      console.error('[palette] Crew list unavailable:', error)
      loadFailed.value = true
    }
  } finally {
    isLoading.value = false
  }
}

watch(isOpen, async (opened) => {
  if (!import.meta.client) return
  document.body.style.overflow = opened ? 'hidden' : ''
  if (!opened) {
    loadRequest?.abort()
    return
  }
  query.value = ''
  activeIndex.value = 0
  await nextTick()
  input.value?.focus()
  loadPlayers()
})

watch(query, () => { activeIndex.value = 0 })

// Any navigation — a picked result, or the browser's back button — dismisses the palette.
watch(() => route.fullPath, () => close())

const moveActive = (step: number) => {
  const count = items.value.length
  activeIndex.value = count ? (activeIndex.value + step + count) % count : 0
}

const runActive = async () => {
  const item = items.value[activeIndex.value]
  if (!item) return
  close()
  await navigateTo(item.href)
}

const onInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1) }
  else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1) }
  else if (event.key === 'Enter') { event.preventDefault(); runActive() }
}

const isTyping = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

const onGlobalKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    toggle()
    return
  }
  if (!isOpen.value && event.key === '/' && !isTyping(event.target)) {
    event.preventDefault()
    open()
    return
  }
  if (isOpen.value && event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  loadRequest?.abort()
  document.body.style.overflow = ''
})
</script>

<template>
  <template v-if="isOpen">
    <div
      class="fixed inset-0 z-[90] grid items-start justify-items-center bg-overlay px-4 pb-4 pt-[calc(12vh+env(safe-area-inset-top,0px))]"
      @click.self="close()"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chercher un joueur du crew"
        class="w-full max-w-[440px] overflow-hidden rounded-3 bg-raised shadow-float"
      >
        <div class="flex h-12 items-center gap-2.5 border-b border-line px-3.5">
          <Icon name="lucide:search" class="size-4 shrink-0 text-ink-3" />
          <input
            ref="input"
            v-model="query"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="player-palette-list"
            aria-autocomplete="list"
            :aria-activedescendant="items.length ? optionId(activeIndex) : undefined"
            aria-label="Pseudo ou Riot ID"
            placeholder="Pseudo ou Riot ID"
            autocomplete="off"
            spellcheck="false"
            class="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-ink outline-none placeholder:text-ink-3"
            @keydown="onInputKeydown"
          >
          <button
            type="button"
            class="inline-flex h-[22px] shrink-0 cursor-pointer items-center rounded-1 border border-line bg-surface px-1.5 font-mono text-[11px] text-ink-2"
            @click="close()"
          >Échap</button>
        </div>

        <div id="player-palette-list" role="listbox" aria-label="Joueurs trouvés" class="max-h-[min(320px,62vh)] overflow-y-auto p-1.5">
          <NuxtLink
            v-for="(item, index) in playerItems"
            :id="optionId(index)"
            :key="item.key"
            :to="item.href"
            role="option"
            :aria-selected="activeIndex === index"
            class="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-2 px-2 py-1.5 text-ink no-underline"
            :class="activeIndex === index ? 'bg-neutral-soft' : 'bg-transparent'"
            @mousemove="activeIndex = index"
            @click="close()"
          >
            <span class="size-[30px] shrink-0 overflow-hidden rounded-full bg-sunken shadow-[0_0_0_1px_var(--line)]">
              <UiAppImage v-if="iconUrl(item.player)" :src="iconUrl(item.player)" alt="" class="size-full object-cover" />
            </span>
            <span class="min-w-0">
              <span class="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                <b class="truncate text-sm font-[640] text-ink">{{ playerName(item.player) }}</b>
                <UiStatus v-if="isMe(item.player)" variant="me">Vous</UiStatus>
                <UiStatus v-if="isSmurf(item.player)" variant="smurf">Smurf</UiStatus>
              </span>
              <span v-if="playerTag(item.player)" class="block font-mono text-[11px] text-ink-3">{{ playerTag(item.player) }}</span>
            </span>
            <LolRankEmblem :rank="item.player.leagueOfLegendsSoloRank" :show-lp="false" size="sm" />
          </NuxtLink>

          <div v-if="isLoading && playerItems.length === 0" class="px-2.5 py-3.5 text-[13px] text-ink-3">Chargement du crew…</div>
          <div v-else-if="loadFailed" class="px-2.5 py-3.5 text-[13px] text-loss-ink">Impossible de charger la liste du crew.</div>
          <div v-else-if="playerItems.length === 0" class="px-2.5 py-3.5 text-[13px] text-ink-3">Personne dans le crew ne porte ce nom.</div>

          <div v-if="actionItems.length > 0" class="mx-2 my-1.5 border-t border-dashed border-line-strong" />
          <NuxtLink
            v-for="(item, offset) in actionItems"
            :id="optionId(playerItems.length + offset)"
            :key="item.key"
            :to="item.href"
            role="option"
            :aria-selected="activeIndex === playerItems.length + offset"
            class="flex items-center gap-2 rounded-2 px-2 py-1.5 text-[13px] font-semibold text-ink no-underline"
            :class="activeIndex === playerItems.length + offset ? 'bg-neutral-soft' : 'bg-transparent'"
            @mousemove="activeIndex = playerItems.length + offset"
            @click="close()"
          >
            → {{ item.label }}
          </NuxtLink>
        </div>

        <div class="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-line px-3.5 py-2 font-mono text-[11.5px] text-ink-3">
          <span>↑↓ naviguer</span><span>↵ ouvrir</span><span>Échap fermer</span>
          <span class="ml-auto font-medium text-ink-2">{{ countLabel }}</span>
        </div>
      </div>
    </div>
  </template>
</template>
