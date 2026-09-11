<script setup lang="ts">
import { computed } from 'vue'
import { useRuntimeConfig } from '#app'
import type { LeaguePlayer } from '~/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useLolStore } from '~/stores/lol'

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

const lolStore = useLolStore()
const primaryPlayer = computed(() => {
  if (!props.player.primaryPlayerId || props.player.primaryPlayerId === props.player.id) return null
  return lolStore.players.find(p => p.id === props.player.primaryPlayerId)
})
</script>

<template>
  <div class="relative">

    <div class="rounded-2xl border border-border-base bg-surface-base p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-5 min-w-0">
        <div class="relative w-22 h-22 shrink-0">
          <span class="block w-full h-full rounded-full overflow-hidden border-[3px] border-border-accent bg-surface-high">
            <UiAppImage v-if="player.lolIconId != null" :src="`https://ddragon.leagueoflegends.com/cdn/${currentLoLPatch}/img/profileicon/${player.lolIconId}.png`" :alt="player.riotGamesNickname || player.nickname" class="w-full h-full object-cover"  />
            <UiAppImage v-else-if="player.profilePictureUrl" :src="`${apiUrl}/player/${player.id}/pp`" :alt="player.riotGamesNickname || player.nickname" class="w-full h-full object-cover"  />
            <img v-else src="~/assets/img/JungleDiff_Logo.png" alt="" class="w-full h-full object-cover" >
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
            <NuxtLink v-if="primaryPlayer" :to="`/summoner/${primaryPlayer.id}`" class="font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-surface-high border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-brand-gold-text transition-colors">
              Smurf de {{ primaryPlayer.riotGamesNickname || primaryPlayer.nickname }}
            </NuxtLink>
          </div>
          <div class="flex items-center gap-2.5 flex-wrap font-mono text-[10.5px] font-bold tracking-widest uppercase text-text-ter">
            <span>{{ syncedAgoLabel }}</span>
          </div>
          <div v-if="player.riotGamesNickname && player.riotGamesTagLine" class="flex flex-wrap items-center gap-2.5 mt-2">
            <a
              :href="`https://www.op.gg/summoners/euw/${player.riotGamesNickname}-${player.riotGamesTagLine}`"
              target="_blank"
              class="group flex items-center justify-center w-8 h-8 rounded-full bg-surface-high border border-border-subtle hover:border-border-accent hover:bg-surface-base transition-all hover:-translate-y-0.5 hover:shadow-md"
              title="Accéder à OP.GG"
            >
              <img src="https://www.google.com/s2/favicons?domain=op.gg&sz=64" alt="OP.GG" class="w-4 h-4 rounded-sm grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
            </a>
            <a
              :href="`https://dpm.lol/${player.riotGamesNickname}-${player.riotGamesTagLine}`"
              target="_blank"
              class="group flex items-center justify-center w-8 h-8 rounded-full bg-surface-high border border-border-subtle hover:border-border-accent hover:bg-surface-base transition-all hover:-translate-y-0.5 hover:shadow-md"
              title="Accéder à DPM.LoL"
            >
              <img src="https://www.google.com/s2/favicons?domain=dpm.lol&sz=64" alt="DPM.LoL" class="w-4 h-4 rounded-sm grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
            </a>
          </div>
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
