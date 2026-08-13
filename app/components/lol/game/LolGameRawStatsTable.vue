<template>
  <button
    type="button"
    class="flex w-full items-center justify-between px-5 py-4"
    :aria-expanded="expanded"
    @click="toggleExpanded"
  >
    <div class="text-left">
      <p class="font-heading text-text-main text-base font-semibold">
        Statistiques brutes
      </p>
      <p class="text-text-ter mt-0.5 text-[13px]">
        Toutes les données Riot par joueur, telles que renvoyées par l'API (noms
        techniques)
      </p>
    </div>

    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      class="text-text-secondary h-4 w-4 shrink-0 transition-transform"
      :class="{ 'rotate-180': expanded }"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  </button>

  <div v-if="expanded" class="border-border-base overflow-x-auto border-t">
    <table class="w-full border-collapse whitespace-nowrap text-xs">
      <thead>
        <tr class="border-border-base border-b">
          <th
            class="bg-surface-base border-border-base sticky left-0 z-10 border-r px-3 py-2 text-left font-semibold"
          >
            Statistique
          </th>
          <th
            v-for="player in players"
            :key="player.id"
            class="px-3 py-2 text-left font-semibold"
          >
            <div class="flex items-center gap-2">
              <div class="relative shrink-0">
                <img
                  class="border-border-base h-6 w-6 rounded-full border object-cover"
                  :src="championIconUrl(player)"
                />
                <img
                  v-if="roleIconUrl(player)"
                  class="border-border-base bg-surface-base absolute -left-1 -top-1 h-3 w-3 rounded-full border p-px"
                  :src="roleIconUrl(player)"
                  :title="roleLabel(player)"
                />
              </div>
              <span
                class="max-w-[7rem] truncate"
                :class="nameColorClass(player)"
              >
                {{ playerDisplayName(player) }}
              </span>
            </div>
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="row in rows"
          :key="row.key"
          class="border-border-base hover:bg-white/5 light:hover:bg-black/5 border-b"
        >
          <td
            class="bg-surface-base border-border-base text-text-ter sticky left-0 z-10 border-r px-3 py-1.5"
          >
            {{ row.label }}
          </td>
            <td
            v-for="player in players"
            :key="player.id"
            class="text-text-main px-3 py-1.5"
          >
            {{ cellValue(player, row.key as string) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import {
  CHALLENGE_FIELD_KEYS,
  challengeFieldLabel,
} from '~/utils/lol-challenge-fields'
import {
  championIconUrl as getChampionIconUrl,
  playerDisplayName as getPlayerDisplayName,
} from '~/utils/lol-match'
import {
  roleIconUrl as getRoleIconUrl,
  roleLabel as getRoleLabel,
} from '~/utils/lol-role'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  patch: string
  expandedDefault?: boolean
}>()

const expanded = ref(props.expandedDefault ?? false)

const toggleExpanded = () => {
  expanded.value = !expanded.value
}

const rows = CHALLENGE_FIELD_KEYS.map((key) => ({
  key,
  label: challengeFieldLabel(key),
}))

const playerDisplayName = (player: LoLGameParticipantDto): string => {
  return getPlayerDisplayName(player)
}

const championIconUrl = (player: LoLGameParticipantDto): string => {
  return getChampionIconUrl(player.championName, props.patch)
}

const roleIconUrl = (player: LoLGameParticipantDto): string | undefined => {
  return getRoleIconUrl(player.teamPosition)
}

const roleLabel = (player: LoLGameParticipantDto): string => {
  return getRoleLabel(player.teamPosition)
}

const nameColorClass = (player: LoLGameParticipantDto): string => {
  return player.teamId === 100 ? 'text-blue-400' : 'text-brand-red'
}

const cellValue = (
  player: LoLGameParticipantDto,
  keyStr: string | number | symbol
): string => {
  const key = keyStr as keyof NonNullable<LoLGameParticipantDto['challenges']>
  const value = player.challenges?.[key]
  if (value == null) {
    return '—'
  }

  if (Number.isInteger(value)) {
    return new Intl.NumberFormat('fr-FR').format(value)
  }

  return (value as number).toFixed(2).replace('.', ',')
}
</script>
