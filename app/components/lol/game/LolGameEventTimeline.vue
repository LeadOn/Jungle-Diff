<template>
  <div class="p-5">
    <div class="flex items-center gap-3">
      <!-- Fixed dark icon color (not text-bg-base, which is theme-reactive) since it must stay dark for contrast on the yellow fill in both themes -->
      <button
        type="button"
        class="bg-brand-gold flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0a0d18] transition-transform hover:scale-105"
        @click="togglePlay"
      >
        <Icon :name="isPlaying ? 'lucide:pause' : 'lucide:play'" size="20" />
      </button>

      <div class="relative h-10 flex-1 cursor-pointer" @click="onTrackClick">
        <div
          class="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border-base light:bg-black/10"
        ></div>

        <div
          v-if="frames.length > 1"
          class="bg-text-main/60 absolute top-0 h-full w-0.5 -translate-x-1/2"
          :style="{ left: `${playheadPercent}%` }"
        ></div>

        <button
          v-for="marker in markers"
          :key="marker.entry.event.id || marker.entry.event.timestamp"
          type="button"
          class="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-bg-base transition-transform hover:scale-125"
          :class="dotClass(marker)"
          :style="{ left: `${marker.leftPercent}%` }"
          :title="tooltipFor(marker)"
          @click="selectMarker(marker, $event)"
        ></button>
      </div>
    </div>

    <div class="text-text-ter mt-2 flex items-center justify-between text-xs font-semibold">
      <span>00:00</span>
      <span class="text-text-main">{{ currentLabel }}</span>
      <span>{{ endLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { formatTimestamp } from '~/utils/lol-match'
import {
  allTimelineEvents,
  describeEvent,
} from '~/utils/lol-timeline-event'
import type { KillFeedCategory, TimelineEventEntry } from '~/utils/lol-timeline-event'

const props = defineProps<{
  timeline?: LoLGameTimelineFrame[]
  players: LoLGameParticipantDto[]
  currentFrameIndex: number
}>()

const emit = defineEmits<{
  (e: 'update:currentFrameIndex', value: number): void
  (e: 'playProgressChange', value: number): void
}>()

interface Marker {
  entry: TimelineEventEntry
  leftPercent: number
  frameIndex: number
}

const VISIBLE_CATEGORIES: KillFeedCategory[] = ['kills', 'objectives']

const CATEGORY_DOT_CLASS: Record<KillFeedCategory, string> = {
  kills: 'bg-brand-red',
  objectives: 'bg-brand-gold',
  wards: 'bg-blue-400',
  other: 'bg-text-ter',
}

const MS_PER_FRAME = 800

const isPlaying = ref(false)
const playProgress = ref(0)
let rafId: number | undefined
let playStartTime = 0
let playStartIndex = 0

const frames = computed(() => props.timeline ?? [])

const durationMs = computed(() => {
  const last = frames.value.at(-1)?.timestamp ?? 0
  return last > 0 ? last : 1
})

const markers = computed<Marker[]>(() => {
  return allTimelineEvents(props.timeline)
    .map((event) => describeEvent(event, props.players))
    .filter((entry) => VISIBLE_CATEGORIES.includes(entry.category))
    .map((entry) => ({
      entry,
      leftPercent: Math.min(100, (entry.event.timestamp / durationMs.value) * 100),
      frameIndex: nearestFrameIndex(entry.event.timestamp),
    }))
})

const endLabel = computed(() => formatTimestamp(frames.value.at(-1)?.timestamp ?? 0))

const currentLabel = computed(() => formatTimestamp(frames.value[props.currentFrameIndex]?.timestamp ?? 0))

const playheadPercent = computed(() => {
  const frame = frames.value[props.currentFrameIndex]
  if (frame == null) return 0
  return Math.min(100, (frame.timestamp / durationMs.value) * 100)
})

const nearestFrameIndex = (timestamp: number): number => {
  let bestIndex = 0
  let bestDiff = Infinity

  frames.value.forEach((frame, index) => {
    const diff = Math.abs(frame.timestamp - timestamp)
    if (diff < bestDiff) {
      bestDiff = diff
      bestIndex = index
    }
  })

  return bestIndex
}

const dotClass = (marker: Marker) => CATEGORY_DOT_CLASS[marker.entry.category]

const tooltipFor = (marker: Marker) => {
  const killerName = marker.entry.killer?.championName ?? ''
  const victimName = marker.entry.victim?.championName ?? ''
  const time = formatTimestamp(marker.entry.event.timestamp)
  return victimName
    ? `${time} — ${killerName} ${marker.entry.label} ${victimName}`
    : `${time} — ${killerName} ${marker.entry.label}`
}

const selectMarker = (marker: Marker, event: MouseEvent) => {
  event.stopPropagation()
  stopPlay()
  emit('update:currentFrameIndex', marker.frameIndex)
}

const onTrackClick = (event: MouseEvent) => {
  if (frames.value.length < 2) return

  stopPlay()

  const track = event.currentTarget as HTMLElement
  const rect = track.getBoundingClientRect()
  const percent = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const index = nearestFrameIndex(percent * durationMs.value)
  emit('update:currentFrameIndex', index)
}

const togglePlay = () => {
  if (isPlaying.value) {
    stopPlay()
    return
  }

  if (frames.value.length <= 1) return

  if (props.currentFrameIndex >= frames.value.length - 1) {
    emit('update:currentFrameIndex', 0)
  }

  isPlaying.value = true
  playStartTime = performance.now()
  playStartIndex = props.currentFrameIndex === frames.value.length - 1 ? 0 : props.currentFrameIndex
  rafId = requestAnimationFrame(tick)
}

const tick = (now: number) => {
  if (!isPlaying.value) return

  const framesElapsed = (now - playStartTime) / MS_PER_FRAME
  const targetIndex = playStartIndex + Math.floor(framesElapsed)

  if (targetIndex >= frames.value.length - 1) {
    playProgress.value = 0
    emit('playProgressChange', 0)
    if (props.currentFrameIndex !== frames.value.length - 1) {
      emit('update:currentFrameIndex', frames.value.length - 1)
    }
    stopPlay()
    return
  }

  if (targetIndex !== props.currentFrameIndex) {
    emit('update:currentFrameIndex', targetIndex)
  }

  playProgress.value = framesElapsed - Math.floor(framesElapsed)
  emit('playProgressChange', playProgress.value)
  rafId = requestAnimationFrame(tick)
}

const stopPlay = () => {
  if (!isPlaying.value) return

  isPlaying.value = false
  playProgress.value = 0
  emit('playProgressChange', 0)

  if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = undefined
  }
}

onUnmounted(() => {
  stopPlay()
})
</script>
