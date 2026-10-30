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
  <section class="overflow-hidden rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface shadow-card">
    <button
      type="button"
      :aria-expanded="expanded"
      class="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors duration-[120ms] ease-out hover:bg-[color-mix(in_oklch,var(--sunken)_55%,var(--surface))] sm:px-5"
      @click="expanded = !expanded"
    >
      <span>
        <span class="type-title block text-ink">Statistiques brutes</span>
        <span class="type-small mt-0.5 block text-ink-2">Toutes les données Riot par joueur, telles que renvoyées par l'API (noms techniques)</span>
      </span>
      <span class="flex size-8 shrink-0 items-center justify-center rounded-2 bg-neutral-soft text-ink-2">
        <Icon name="lucide:chevron-down" class="size-[15px] transition-transform duration-200 ease-out" :class="{ 'rotate-180': expanded }" />
      </span>
    </button>

    <div v-if="expanded" class="overflow-x-auto border-t border-line">
      <table class="w-full border-collapse whitespace-nowrap text-[12.5px]">
        <thead>
          <tr>
            <th class="type-label sticky left-0 z-[2] border-r border-line bg-surface px-4 py-3 text-left text-ink-2">Statistique</th>
            <th
              v-for="player in players"
              :key="player.puuid"
              class="px-3 py-2.5 text-left font-semibold"
              :class="{ 'bg-gold-soft': isMe(player) }"
            >
              <span class="flex items-center gap-2">
                <span class="relative size-[26px] shrink-0">
                  <span class="absolute inset-0 rounded-2 bg-sunken bg-[length:112%] bg-center" :style="championStyle(player)" />
                  <span
                    v-if="roleIconUrl(player.teamPosition)"
                    :title="roleLabel(player.teamPosition)"
                    class="absolute -left-[5px] -top-[5px] flex size-3.5 items-center justify-center rounded-full bg-night"
                  >
                    <img :src="roleIconUrl(player.teamPosition)" alt="" class="size-2 brightness-0 invert">
                  </span>
                </span>
                <span
                  class="max-w-[110px] truncate"
                  :class="player.teamId === 100 ? 'text-side-blue-ink' : 'text-side-red-ink'"
                >{{ playerRiotName(player) }}</span>
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(row, index) in rows" :key="row.key" :class="index % 2 ? 'bg-surface' : 'bg-paper'">
            <!-- Sticky over the scrolled columns, so it repeats the zebra fill of its row. -->
            <td
              class="sticky left-0 z-[1] border-r border-t border-line px-4 py-2 font-medium text-ink-2"
              :class="index % 2 ? 'bg-surface' : 'bg-paper'"
            >
              {{ row.label }}
            </td>
            <td
              v-for="player in players"
              :key="player.puuid"
              class="type-mono border-t border-[color-mix(in_oklch,var(--line)_70%,transparent)] px-3 py-2 text-[12.5px] text-ink"
              :class="{ 'bg-gold-soft': isMe(player) }"
            >
              {{ cellValue(player, row.key) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
