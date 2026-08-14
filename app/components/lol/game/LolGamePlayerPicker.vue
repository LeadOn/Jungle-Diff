<template>
  <div class="flex flex-wrap gap-2">
    <button
      v-for="player in players"
      :key="player.puuid"
      type="button"
      :aria-pressed="player.puuid === selectedPuuid"
      class="inline-flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-semibold transition-colors"
      :class="pillClass(player)"
      @click="select(player)"
    >
      <img
        :src="championIconUrl(player)"
        :alt="player.championName"
        class="h-7 w-7 shrink-0 rounded-full object-cover ring-2"
        :class="ringClass(player)"
      />
      {{ displayName(player) }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { LoLGameParticipantDto } from '~/lib/types/match'
import { championIconUrl as getChampionIconUrl } from '~/utils/lol-match'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  selectedPuuid?: string
  patch: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedPuuid', puuid: string): void
}>()

const select = (player: LoLGameParticipantDto) => {
  emit('update:selectedPuuid', player.puuid ?? '')
}

const championIconUrl = (player: LoLGameParticipantDto): string => {
  return getChampionIconUrl(player.championName ?? '', props.patch)
}

const displayName = (player: LoLGameParticipantDto): string => {
  return player.riotIdGameName || 'Inconnu'
}

const ringClass = (player: LoLGameParticipantDto): string => {
  return player.teamId === 100 ? 'ring-brand-green' : 'ring-brand-red'
}

const pillClass = (player: LoLGameParticipantDto): string => {
  if (player.puuid === props.selectedPuuid) {
    return 'border-brand-gold/60 bg-brand-gold/10 text-brand-gold'
  }
  return 'border-border-base text-text-secondary hover:text-text-main bg-white/5 hover:bg-white/10 light:bg-black/5'
}
</script>
