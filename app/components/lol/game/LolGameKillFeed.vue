<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { championIconUrl, formatTimestamp, nearestFrameIndex } from '~/utils/lol-match'
import { championDisplayName } from '~/utils/lol-champion'
import { allTimelineEvents, describeEvent, teamAccentTextClass } from '~/utils/lol-timeline-event'
import type { KillFeedCategory, TimelineEventEntry } from '~/utils/lol-timeline-event'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  patch: string
  /** The film's position: events after it are dimmed, so the feed reads as the game so far. */
  currentFrameIndex: number
}>()

const emit = defineEmits<{
  (e: 'frameSelected', frameIndex: number): void
}>()

type FeedFilter = 'all' | KillFeedCategory

const VISIBLE_CATEGORIES: KillFeedCategory[] = ['kills', 'objectives', 'wards']

const FILTERS: { value: FeedFilter, label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'kills', label: 'Éliminations' },
  { value: 'objectives', label: 'Objectifs' },
  { value: 'wards', label: 'Wards' },
]

const filter = ref<FeedFilter>('all')

const frames = computed(() => props.timeline ?? [])
const currentTimestamp = computed(() => frames.value[props.currentFrameIndex]?.timestamp ?? 0)

const entries = computed<TimelineEventEntry[]>(() => {
  const all = allTimelineEvents(props.timeline)
    .map(event => describeEvent(event, props.players))
    .filter(entry => VISIBLE_CATEGORIES.includes(entry.category))

  return filter.value === 'all' ? all : all.filter(entry => entry.category === filter.value)
})

const countLabel = computed(() => `${entries.value.length} événement${entries.value.length > 1 ? 's' : ''}`)

const championName = (player?: LoLGameParticipantDto) => (player?.championName ? championDisplayName(player.championName) : '')
const championStyle = (player: LoLGameParticipantDto) => ({ backgroundImage: `url('${championIconUrl(player.championName, props.patch)}')` })

const isPast = (entry: TimelineEventEntry) => entry.event.timestamp <= currentTimestamp.value

const select = (entry: TimelineEventEntry) => emit('frameSelected', nearestFrameIndex(frames.value, entry.event.timestamp))
</script>

<template>
  <section aria-labelledby="game-kill-feed" class="rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-5 shadow-card">
    <div class="flex items-baseline justify-between gap-3">
      <h3 id="game-kill-feed" class="m-0 type-title text-ink">Kill feed</h3>
      <span class="type-mono text-ink-3">{{ countLabel }}</span>
    </div>
    <p class="m-0 mb-3.5 mt-0.5 type-small text-ink-2">Cliquez un événement pour y déplacer le film</p>

    <UiSegmented
      v-model="filter"
      :options="FILTERS"
      aria-label="Filtrer les événements"
      class="mb-3.5 max-w-full flex-wrap"
    />

    <p v-if="entries.length === 0" class="m-0 py-6 text-center type-small text-ink-2">
      Aucun événement pour ce filtre.
    </p>

    <div v-else class="flex max-h-[540px] flex-col gap-1.5 overflow-y-auto pr-0.5">
      <button
        v-for="entry in entries"
        :key="entry.event.id || entry.event.timestamp"
        type="button"
        class="flex w-full cursor-pointer items-center gap-2.5 rounded-3 border border-line px-2.5 py-2 text-left transition-[background-color,opacity] duration-[120ms] ease-out hover:bg-sunken"
        :class="isPast(entry) ? 'bg-paper' : 'bg-surface opacity-60'"
        @click="select(entry)"
      >
        <span class="w-12 shrink-0 rounded-1 border border-line bg-surface py-0.5 text-center type-mono text-ink">
          {{ formatTimestamp(entry.event.timestamp) }}
        </span>

        <span v-if="entry.iconUrl" class="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-night">
          <UiAppImage :src="entry.iconUrl" alt="" class="size-[15px] object-contain" />
        </span>
        <span v-else class="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-loss-soft">
          <span class="size-2 rounded-full bg-loss" />
        </span>

        <span
          v-if="entry.killer"
          class="size-[26px] shrink-0 rounded-full bg-sunken bg-[length:112%] bg-center"
          :style="championStyle(entry.killer)"
        />

        <span class="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">
          <span v-if="entry.killer" class="font-semibold" :class="teamAccentTextClass(entry.teamId)">{{ championName(entry.killer) }}</span>
          {{ ' ' }}<span class="text-ink-2">{{ entry.label }}</span>
          <template v-if="entry.victim">
            {{ ' ' }}<span class="font-semibold">{{ championName(entry.victim) }}</span>
          </template>
        </span>

        <span v-if="entry.assists.length > 0" class="flex shrink-0 items-center gap-[5px]">
          <span class="type-label text-[0.625rem] text-ink-2">Assist</span>
          <span class="flex">
            <span
              v-for="(assist, index) in entry.assists"
              :key="assist.puuid"
              :title="championName(assist)"
              class="size-5 rounded-full border-[1.5px] border-surface bg-sunken bg-[length:112%] bg-center"
              :class="{ '-ml-[7px]': index > 0 }"
              :style="championStyle(assist)"
            />
          </span>
        </span>
      </button>
    </div>
  </section>
</template>
