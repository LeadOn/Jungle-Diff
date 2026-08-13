<script setup lang="ts">
import { computed } from 'vue'
import { useRuntimeConfig } from '#app'
import type { LeaguePlayer } from '~/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

const props = defineProps<{
  player: LeaguePlayer
  currentLoLPatch: string
  isRefreshing?: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const config = useRuntimeConfig()
const apiUrl = config.public.gameOnApiUrl

const syncedAgoLabel = computed(() => {
  if (!props.player.lolRefreshedOn) return 'Jamais synchronisé'
  const date = new Date(props.player.lolRefreshedOn)
  if (isNaN(date.getTime())) return 'Jamais synchronisé'
  return 'Synchro il y a ' + formatDistanceToNow(date, { locale: fr })
})
</script>

<template>
  <div class="relative">

    <div class="rounded-2xl border border-border-base bg-surface-base p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-5 min-w-0">
        <div class="relative w-22 h-22 shrink-0">
          <span class="block w-full h-full rounded-full overflow-hidden border-[3px] border-border-accent bg-surface-high">
            <img v-if="player.lolIconId != null" :src="`https://ddragon.leagueoflegends.com/cdn/${currentLoLPatch}/img/profileicon/${player.lolIconId}.png`" class="w-full h-full object-cover" >
            <img v-else-if="player.profilePictureUrl" :src="`${apiUrl}/player/${player.id}/pp`" class="w-full h-full object-cover" >
            <img v-else src="~/assets/img/JungleDiff_Logo.png" class="w-full h-full object-cover" >
          </span>
          <span v-if="player.lolSummonerLevel != null" class="absolute -bottom-0.5 -right-1.5 px-2 py-0.5 rounded-full bg-surface-high border-2 border-surface-base shadow-sm font-mono text-[10px] font-bold text-text-main whitespace-nowrap">
            {{ player.lolSummonerLevel }}
          </span>
        </div>

        <div class="flex flex-col gap-2 min-w-0">
          <div class="flex items-baseline gap-2 flex-wrap">
            <h1 class="m-0 text-[26px] md:text-[34px] font-extrabold tracking-[-0.03em] leading-none text-text-main truncate">{{ player.riotGamesNickname || player.nickname }}</h1>
            <span v-if="player.riotGamesTagLine" class="text-lg font-semibold text-text-ter">#{{ player.riotGamesTagLine }}</span>
            <span v-if="player.archived" class="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-surface-high border border-border-subtle text-text-ter">Archivé</span>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap font-mono text-[10.5px] font-bold tracking-widest uppercase text-text-ter">
            <span>{{ syncedAgoLabel }}</span>
          </div>
          <a
            v-if="player.riotGamesNickname && player.riotGamesTagLine"
            :href="`https://www.op.gg/summoners/euw/${player.riotGamesNickname}-${player.riotGamesTagLine}`"
            target="_blank"
            class="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline w-fit"
          >
            Accéder à OP.GG
            <Icon name="lucide:external-link" class="text-xs" />
          </a>
        </div>
      </div>

      <div class="flex items-center gap-2.5 shrink-0">
        <button
          :disabled="isRefreshing"
          class="flex items-center gap-2 h-9.5 px-4.5 rounded-full bg-brand-gold text-brand-gold-text font-bold text-[13px] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="emit('refresh')"
        >
          <Icon name="lucide:refresh-cw" :class="{ 'animate-spin': isRefreshing }" />
          Rafraîchir
        </button>
        <span title="Pas encore implémenté" class="flex items-center h-9.5 px-4.5 rounded-full bg-surface-high border border-border-subtle text-text-ter font-bold text-[13px] cursor-default select-none opacity-60">
          Comparer
        </span>
      </div>
    </div>
  </div>
</template>
