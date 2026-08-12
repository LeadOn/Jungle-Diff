<script setup lang="ts">
import { computed } from 'vue'
import { useRuntimeConfig } from '#app'
import type { LeaguePlayer } from '~/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const props = defineProps<{
  player: LeaguePlayer
  rankPosition?: number | null
  currentLoLPatch: string
  isRefreshing?: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const config = useRuntimeConfig()
const apiUrl = config.public.gameOnApiUrl

const rankPositionLabel = computed(() => {
  if (props.rankPosition == null) return null
  return props.rankPosition === 1 ? '1er du classement' : `${props.rankPosition}e du classement`
})

const syncedAgoLabel = computed(() => {
  if (!props.player.lolRefreshedOn) return 'Jamais synchronisé'
  const date = new Date(props.player.lolRefreshedOn)
  if (isNaN(date.getTime())) return 'Jamais synchronisé'
  return 'Synchro il y a ' + formatDistanceToNow(date, { locale: fr })
})
</script>

<template>
  <div class="relative">
    <div class="bg-blue-500/25 pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] blur-3xl"></div>
    <div class="border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 shadow-sm backdrop-blur-md backdrop-contrast-100 backdrop-saturate-100 backdrop-filter">
      
      <div class="flex items-center gap-4">
        <div class="relative shrink-0">
          <img v-if="player.lolIconId != null" :src="`https://ddragon.leagueoflegends.com/cdn/${currentLoLPatch}/img/profileicon/${player.lolIconId}.png`" class="drop-shadow-[0_0_12px_rgba(115,195,233,0.65)] h-16 w-16 rounded-full object-cover" />
          <img v-else-if="player.profilePictureUrl" :src="`${apiUrl}/player/${player.id}/pp`" class="drop-shadow-[0_0_12px_rgba(115,195,233,0.65)] h-16 w-16 rounded-full object-cover" />
          <img v-else src="~/assets/img/JungleDiff_Logo.png" class="drop-shadow-[0_0_12px_rgba(115,195,233,0.65)] h-16 w-16 rounded-full object-cover" />
          <span class="bg-blue-600 text-white absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2 text-xs font-semibold whitespace-nowrap">{{ player.lolSummonerLevel }}</span>
        </div>
        
        <div class="min-w-0">
          <div class="flex flex-wrap items-baseline gap-1.5">
            <span class="text-gray-900 dark:text-white truncate text-xl font-semibold">{{ player.riotGamesNickname }}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">#{{ player.riotGamesTagLine }}</span>
            <span v-if="player.archived" class="bg-gray-600/80 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white uppercase tracking-wide">Archivé</span>
          </div>
          <p class="truncate text-sm text-gray-500 dark:text-gray-300">
            {{ player.fullName || player.nickname }}
            <span v-if="rankPositionLabel"> &middot; {{ rankPositionLabel }}</span>
          </p>
          <a :href="`https://www.op.gg/summoners/euw/${player.riotGamesNickname}-${player.riotGamesTagLine}`" target="_blank" class="text-blue-500 inline-flex items-center gap-1 text-sm hover:underline">
            Accéder à OP.GG
            <Icon name="lucide:external-link" class="text-xs" />
          </a>
        </div>
      </div>

      <button
        @click="emit('refresh')"
        :disabled="isRefreshing"
        class="border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Rafraîchir le profil"
      >
        <Icon name="lucide:refresh-cw" :class="{ 'animate-spin': isRefreshing }" />
        {{ syncedAgoLabel }}
      </button>

    </div>
  </div>
</template>
