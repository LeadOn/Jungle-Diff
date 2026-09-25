<script setup lang="ts">
import { ref } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import { CHALLENGE_FIELD_KEYS, challengeFieldLabel } from '~/utils/lol-challenge-fields'
import { championIconUrl, playerRiotName } from '~/utils/lol-match'
import { roleIconUrl, roleLabel } from '~/utils/lol-role'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  patch: string
  expandedDefault?: boolean
  /** The signed-in viewer's GameOn id, resolved after mount; `null` otherwise. */
  mePlayerId?: number | null
}>()

const expanded = ref(props.expandedDefault ?? false)

const rows = CHALLENGE_FIELD_KEYS.map(key => ({ key, label: challengeFieldLabel(key) }))

const numberFormat = new Intl.NumberFormat('fr-FR')

const cellValue = (player: LoLGameParticipantDto, key: (typeof CHALLENGE_FIELD_KEYS)[number]): string => {
  const value = player.challenges?.[key]
  if (value == null) return '—'
  if (typeof value !== 'number') return String(value)
  return Number.isInteger(value) ? numberFormat.format(value) : value.toFixed(2).replace('.', ',')
}

const isMe = (player: LoLGameParticipantDto) => props.mePlayerId != null && player.playerId === props.mePlayerId

const championStyle = (player: LoLGameParticipantDto) => ({ backgroundImage: `url('${championIconUrl(player.championName, props.patch)}')` })
</script>

<template>
  <section class="animate-rise overflow-hidden rounded-[26px] border border-border-subtle bg-surface-base shadow-card">
    <button
      type="button"
      :aria-expanded="expanded"
      class="flex w-full cursor-pointer items-center justify-between gap-3 p-[22px] text-left"
      @click="expanded = !expanded"
    >
      <span>
        <span class="block text-xl font-bold tracking-[-0.025em]">Statistiques brutes</span>
        <span class="mt-[3px] block text-[12.5px] font-semibold text-text-sec">Toutes les données Riot par joueur, telles que renvoyées par l'API (noms techniques)</span>
      </span>
      <span class="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-surface-muted">
        <Icon name="lucide:chevron-down" class="size-[15px] transition-transform duration-300 ease-spring" :class="{ 'rotate-180': expanded }" />
      </span>
    </button>

    <div v-if="expanded" class="overflow-x-auto border-t border-border-base">
      <table class="w-full border-collapse whitespace-nowrap text-[12.5px]">
        <thead>
          <tr>
            <th class="sticky left-0 z-[2] border-r border-border-base bg-surface-base px-4 py-3 text-left font-bold">Statistique</th>
            <th
              v-for="player in players"
              :key="player.puuid"
              class="px-3 py-2.5 text-left font-bold"
              :class="{ 'bg-surface-highlight': isMe(player) }"
            >
              <span class="flex items-center gap-2">
                <span class="relative size-[26px] shrink-0">
                  <span class="absolute inset-0 rounded-lg bg-surface-sunken bg-[length:112%] bg-center" :style="championStyle(player)" />
                  <span
                    v-if="roleIconUrl(player.teamPosition)"
                    :title="roleLabel(player.teamPosition)"
                    class="absolute -left-[5px] -top-[5px] flex size-3.5 items-center justify-center rounded-full bg-ink"
                  >
                    <img :src="roleIconUrl(player.teamPosition)" alt="" class="size-2 brightness-0 invert">
                  </span>
                </span>
                <span
                  class="max-w-[110px] truncate"
                  :class="player.teamId === 100 ? 'text-team-blue-text' : 'text-team-red-text'"
                >{{ playerRiotName(player) }}</span>
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(row, index) in rows" :key="row.key" :class="index % 2 ? 'bg-surface-base' : 'bg-surface-hover'">
            <!-- Sticky over the scrolled columns, so it repeats the zebra fill of its row. -->
            <td
              class="sticky left-0 z-[1] border-r border-t border-border-base px-4 py-2 font-semibold text-text-sec"
              :class="index % 2 ? 'bg-surface-base' : 'bg-surface-hover'"
            >
              {{ row.label }}
            </td>
            <td
              v-for="player in players"
              :key="player.puuid"
              class="border-t border-border-subtle px-3 py-2 font-mono font-medium"
              :class="{ 'bg-surface-highlight': isMe(player) }"
            >
              {{ cellValue(player, row.key) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
