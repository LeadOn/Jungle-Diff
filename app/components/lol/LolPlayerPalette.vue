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
import { compareRanksDesc, tierEmblemUrl, tierLabel } from '~/utils/lol-tier'
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
    <div class="fixed inset-0 z-[90] animate-fade bg-ink/35 backdrop-blur-[4px]" @click="close()" />
    <div class="pointer-events-none fixed inset-0 z-[91] flex items-start justify-center p-3 md:px-4 md:pb-4 md:pt-[12vh]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chercher un joueur du crew"
        class="pointer-events-auto w-full max-w-[580px] animate-pop overflow-hidden rounded-[26px] border border-border-base bg-surface-base shadow-card"
      >
        <div class="flex h-[62px] items-center gap-3 border-b border-border-base pl-5 pr-3.5">
          <Icon name="lucide:search" class="size-[19px] shrink-0 text-text-main" />
          <input
            ref="input"
            v-model="query"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="player-palette-list"
            aria-autocomplete="list"
            :aria-activedescendant="items.length ? optionId(activeIndex) : undefined"
            aria-label="Chercher un joueur du crew"
            placeholder="Chercher un joueur du crew…"
            autocomplete="off"
            spellcheck="false"
            class="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[17px] font-bold text-text-main outline-none"
            @keydown="onInputKeydown"
          >
          <button type="button" class="shrink-0 cursor-pointer rounded-full bg-inverse px-[9px] py-[5px] font-mono text-[11px] text-inverse-text" @click="close()">Esc</button>
        </div>

        <div id="player-palette-list" role="listbox" aria-label="Résultats" class="max-h-[min(440px,62vh)] overflow-y-auto p-2">
          <NuxtLink
            v-for="(item, index) in playerItems"
            :id="optionId(index)"
            :key="item.key"
            :to="item.href"
            role="option"
            :aria-selected="activeIndex === index"
            class="flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors duration-100"
            :class="activeIndex === index ? 'bg-win-soft' : 'bg-transparent'"
            @mousemove="activeIndex = index"
            @click="close()"
          >
            <span class="size-9 shrink-0 overflow-hidden rounded-xl border border-border-base bg-surface-sunken">
              <UiAppImage v-if="iconUrl(item.player)" :src="iconUrl(item.player)" alt="" class="size-full object-cover" />
            </span>
            <span class="flex min-w-0 flex-1 items-center gap-[7px] overflow-hidden whitespace-nowrap">
              <span class="text-[15px] font-bold text-text-main">{{ playerName(item.player) }}</span>
              <span class="text-[12.5px] font-semibold text-text-sec">{{ playerTag(item.player) }}</span>
              <span v-if="isMe(item.player)" class="rounded-full bg-brand-gold px-[7px] py-px text-[10.5px] font-bold text-brand-gold-text">Vous</span>
              <span v-if="isSmurf(item.player)" class="rounded-full border border-border-accent px-1.5 text-[10.5px] font-bold text-text-main">Smurf</span>
            </span>
            <span class="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-bold text-text-main">
              <img :src="tierEmblemUrl(item.player.leagueOfLegendsSoloRank)" alt="" class="size-6 object-contain">
              {{ tierLabel(item.player.leagueOfLegendsSoloRank) }}
            </span>
          </NuxtLink>

          <div v-if="isLoading && playerItems.length === 0" class="px-3 py-[18px] text-sm font-semibold text-text-sec">Chargement du crew…</div>
          <div v-else-if="loadFailed" class="px-3 py-[18px] text-sm font-semibold text-brand-red">Impossible de charger la liste du crew.</div>
          <div v-else-if="playerItems.length === 0" class="px-3 py-[18px] text-sm font-semibold text-text-sec">Aucun joueur du crew ne correspond à « {{ query }} ».</div>

          <div v-if="actionItems.length > 0" class="mx-2.5 my-1.5 h-0 border-t-2 border-dashed border-border-dashed" />
          <NuxtLink
            v-for="(item, offset) in actionItems"
            :id="optionId(playerItems.length + offset)"
            :key="item.key"
            :to="item.href"
            role="option"
            :aria-selected="activeIndex === playerItems.length + offset"
            class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[14.5px] font-bold text-text-main"
            :class="activeIndex === playerItems.length + offset ? 'bg-win-soft' : 'bg-transparent'"
            @mousemove="activeIndex = playerItems.length + offset"
            @click="close()"
          >
            → {{ item.label }}
          </NuxtLink>
        </div>

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border-base bg-surface-muted px-[18px] py-[11px] font-mono text-[11px] text-text-sec">
          <span>↑ ↓ naviguer</span><span>↵ ouvrir</span><span>esc fermer</span>
          <span class="ml-auto font-semibold text-text-main">{{ countLabel }}</span>
        </div>
      </div>
    </div>
  </template>
</template>
