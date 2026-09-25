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
      class="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-full border pl-[5px] pr-3.5 text-[13px] font-bold transition-[background-color,color,translate] duration-[250ms] ease-spring hover:-translate-y-0.5"
      :class="player.puuid === selectedPuuid ? 'border-inverse bg-inverse text-inverse-text' : 'border-border-base bg-surface-base text-text-main'"
      @click="emit('update:selectedPuuid', player.puuid ?? '')"
    >
      <span
        class="size-7 shrink-0 rounded-full bg-surface-sunken bg-[length:112%] bg-center ring-2"
        :class="player.teamId === 100 ? 'ring-team-blue' : 'ring-team-red'"
        :style="championStyle(player)"
      />
      {{ player.riotIdGameName || 'Inconnu' }}
    </button>
  </div>
</template>
