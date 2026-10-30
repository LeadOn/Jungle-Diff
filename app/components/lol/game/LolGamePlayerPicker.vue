<script setup lang="ts">
import type { LoLGameParticipantDto } from '~/lib/types/match'
import { championIconUrl } from '~/utils/lol-match'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  selectedPuuid?: string
  patch: string
}>()

const emit = defineEmits<{
  (e: 'update:selectedPuuid', puuid: string): void
}>()

const championStyle = (player: LoLGameParticipantDto) => ({ backgroundImage: `url('${championIconUrl(player.championName, props.patch)}')` })
</script>

<template>
  <div role="group" aria-label="Choisir un joueur" class="flex flex-wrap gap-2">
    <button
      v-for="player in players"
      :key="player.puuid"
      type="button"
      :aria-pressed="player.puuid === selectedPuuid"
      class="inline-flex h-9 cursor-pointer items-center gap-2 rounded-2 border pl-1 pr-3 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-[120ms] ease-out"
      :class="player.puuid === selectedPuuid ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink hover:border-line-strong'"
      @click="emit('update:selectedPuuid', player.puuid ?? '')"
    >
      <span
        class="size-7 shrink-0 rounded-full bg-sunken bg-[length:112%] bg-center ring-2"
        :class="player.teamId === 100 ? 'ring-side-blue' : 'ring-side-red'"
        :style="championStyle(player)"
      />
      {{ player.riotIdGameName || 'Inconnu' }}
    </button>
  </div>
</template>
