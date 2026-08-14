<template>
  <div class="p-5">
    <div class="border-border-base mb-4 flex flex-wrap items-center gap-1 rounded-full border p-1">
      <button
        v-for="f in filters"
        :key="f.key"
        type="button"
        class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
        :class="[
          filter === f.key
            ? 'text-text-main bg-white/10 light:bg-black/5'
            : 'text-text-ter hover:text-text-main'
        ]"
        @click="setFilter(f.key)"
      >
        {{ f.label }}
      </button>
    </div>

    <p v-if="entries.length === 0" class="text-text-ter py-6 text-center text-sm">
      Aucun événement pour ce filtre.
    </p>

    <div v-else class="max-h-[520px] space-y-1 overflow-y-auto pr-1">
      <div
        v-for="entry in entries"
        :key="entry.event.id || entry.event.timestamp"
        class="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2 light:bg-black/5"
      >
        <span class="text-text-ter w-12 shrink-0 text-right text-xs font-semibold">
          {{ timeLabel(entry) }}
        </span>

        <img
          v-if="entry.iconUrl"
          :src="entry.iconUrl"
          alt=""
          class="h-5 w-5 shrink-0 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
        />
        <span v-else class="w-5 shrink-0 text-center text-sm">{{ entry.icon }}</span>

        <img
          v-if="entry.killer"
          :src="championIconUrl(entry.killer)"
          alt=""
          class="h-6 w-6 shrink-0 rounded-full border border-white/20 object-cover"
        />

        <div class="min-w-0 flex-1 truncate text-sm">
          <span
            v-if="entry.killer"
            class="font-semibold"
            :class="accentClass(entry)"
          >
            {{ displayName(entry.killer) }}
          </span>
          <span class="text-text-secondary mx-1">{{ entry.label }}</span>
          <span
            v-if="entry.victim"
            class="text-text-main font-semibold"
          >
            {{ displayName(entry.victim) }}
          </span>
        </div>

        <img
          v-if="entry.victim"
          :src="championIconUrl(entry.victim)"
          alt=""
          class="h-6 w-6 shrink-0 rounded-full border border-white/20 object-cover"
        />

        <div v-if="entry.assists.length > 0" class="flex shrink-0 items-center gap-1.5">
          <span class="text-text-ter text-[10px] font-semibold tracking-wide uppercase">
            Assist
          </span>
          <div class="flex -space-x-2">
            <img
              v-for="assist in entry.assists"
              :key="assist.puuid"
              :src="championIconUrl(assist)"
              :alt="displayName(assist)"
              :title="displayName(assist)"
              class="border-bg-base h-5 w-5 shrink-0 rounded-full border object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { championIconUrl as getChampionIconUrl, formatTimestamp } from '~/utils/lol-match'
import {
  allTimelineEvents,
  describeEvent,
  teamAccentTextClass,
} from '~/utils/lol-timeline-event'
import type { KillFeedCategory, TimelineEventEntry } from '~/utils/lol-timeline-event'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  patch: string
}>()

type FeedFilter = 'all' | KillFeedCategory

const VISIBLE_CATEGORIES: KillFeedCategory[] = ['kills', 'objectives', 'wards']

const filter = ref<FeedFilter>('all')

const filters: { key: FeedFilter; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'kills', label: 'Éliminations' },
  { key: 'objectives', label: 'Objectifs' },
  { key: 'wards', label: 'Wards' },
]

const entries = computed<TimelineEventEntry[]>(() => {
  const all = allTimelineEvents(props.timeline)
    .map((event) => describeEvent(event, props.players))
    .filter((entry) => VISIBLE_CATEGORIES.includes(entry.category))

  if (filter.value === 'all') {
    return all
  }

  return all.filter((entry) => entry.category === filter.value)
})

const setFilter = (f: FeedFilter) => {
  filter.value = f
}

const timeLabel = (entry: TimelineEventEntry): string => {
  return formatTimestamp(entry.event.timestamp)
}

const championIconUrl = (player?: LoLGameParticipantDto): string => {
  return getChampionIconUrl(player?.championName, props.patch)
}

const accentClass = (entry: TimelineEventEntry): string => {
  return teamAccentTextClass(entry.teamId)
}

const displayName = (player?: LoLGameParticipantDto): string => {
  return player?.championName ?? 'Inconnu'
}
</script>
