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

const FILTERS: { key: FeedFilter, label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'kills', label: 'Éliminations' },
  { key: 'objectives', label: 'Objectifs' },
  { key: 'wards', label: 'Wards' },
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
  <section aria-labelledby="game-kill-feed" class="rounded-[26px] border border-border-subtle bg-surface-base p-[22px] shadow-card">
    <div class="flex items-baseline justify-between gap-3">
      <h3 id="game-kill-feed" class="m-0 text-xl font-bold tracking-[-0.025em]">Kill feed</h3>
      <span class="text-[12.5px] font-semibold text-text-sec">{{ countLabel }}</span>
    </div>
    <p class="m-0 mb-3.5 mt-[3px] text-[12.5px] font-semibold text-text-sec">Cliquez un événement pour y déplacer le film</p>

    <div role="group" aria-label="Filtrer les événements" class="mb-3.5 inline-flex flex-wrap rounded-full border border-border-subtle bg-surface-muted p-[3px]">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        type="button"
        :aria-pressed="filter === f.key"
        class="cursor-pointer rounded-full px-[13px] py-1.5 text-[12.5px] font-bold transition-colors duration-200"
        :class="filter === f.key ? 'bg-inverse text-inverse-text' : 'text-text-main'"
        @click="filter = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <p v-if="entries.length === 0" class="m-0 py-6 text-center text-sm font-semibold text-text-sec">
      Aucun événement pour ce filtre.
    </p>

    <div v-else class="flex max-h-[540px] flex-col gap-1.5 overflow-y-auto pr-0.5">
      <button
        v-for="entry in entries"
        :key="entry.event.id || entry.event.timestamp"
        type="button"
        class="flex w-full cursor-pointer items-center gap-2.5 rounded-[14px] border border-border-subtle px-2.5 py-2 text-left transition-[translate,opacity] duration-300 ease-spring hover:translate-x-[3px]"
        :class="isPast(entry) ? 'bg-surface-muted' : 'bg-surface-base opacity-55'"
        @click="select(entry)"
      >
        <span class="w-12 shrink-0 rounded-full border border-border-base bg-surface-base py-0.5 text-center font-mono text-[11.5px] font-semibold">
          {{ formatTimestamp(entry.event.timestamp) }}
        </span>

        <span v-if="entry.iconUrl" class="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-ink">
          <UiAppImage :src="entry.iconUrl" alt="" class="size-[15px] object-contain" />
        </span>
        <span v-else class="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-loss-soft">
          <span class="size-2 rounded-full bg-loss" />
        </span>

        <span
          v-if="entry.killer"
          class="size-[26px] shrink-0 rounded-full bg-surface-sunken bg-[length:112%] bg-center"
          :style="championStyle(entry.killer)"
        />

        <span class="min-w-0 flex-1 truncate text-[13.5px]">
          <span v-if="entry.killer" class="font-bold" :class="teamAccentTextClass(entry.teamId)">{{ championName(entry.killer) }}</span>
          {{ ' ' }}<span class="font-medium text-text-sec">{{ entry.label }}</span>
          <template v-if="entry.victim">
            {{ ' ' }}<span class="font-bold">{{ championName(entry.victim) }}</span>
          </template>
        </span>

        <span v-if="entry.assists.length > 0" class="flex shrink-0 items-center gap-[5px]">
          <span class="text-[10.5px] font-bold uppercase tracking-[0.04em] text-text-sec">Assist</span>
          <span class="flex">
            <span
              v-for="(assist, index) in entry.assists"
              :key="assist.puuid"
              :title="championName(assist)"
              class="size-5 rounded-full border-[1.5px] border-surface-base bg-surface-sunken bg-[length:112%] bg-center"
              :class="{ '-ml-[7px]': index > 0 }"
              :style="championStyle(assist)"
            />
          </span>
        </span>
      </button>
    </div>
  </section>
</template>
