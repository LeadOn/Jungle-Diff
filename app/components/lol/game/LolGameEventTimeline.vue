<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { formatTimestamp, nearestFrameIndex } from '~/utils/lol-match'
import { allTimelineEvents, describeEvent } from '~/utils/lol-timeline-event'
import type { KillFeedCategory, TimelineEventEntry } from '~/utils/lol-timeline-event'
import { championDisplayName } from '~/utils/lol-champion'

const props = defineProps<{
  timeline?: LoLGameTimelineFrame[]
  players: LoLGameParticipantDto[]
  currentFrameIndex: number
}>()

const emit = defineEmits<{
  (e: 'update:currentFrameIndex' | 'playProgressChange', value: number): void
}>()

interface Marker {
  entry: TimelineEventEntry
  leftPercent: number
  frameIndex: number
  title: string
}

// Wards would bury the track under dots: they stay in the kill feed only.
const VISIBLE_CATEGORIES: KillFeedCategory[] = ['kills', 'objectives']

const CATEGORY_DOT_CLASS: Record<KillFeedCategory, string> = {
  kills: 'bg-loss',
  objectives: 'bg-brand-gold-bright',
  wards: 'bg-team-blue',
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

const championOf = (player?: LoLGameParticipantDto) => (player?.championName ? championDisplayName(player.championName) : '')

const markers = computed<Marker[]>(() => allTimelineEvents(props.timeline)
  .map(event => describeEvent(event, props.players))
  .filter(entry => VISIBLE_CATEGORIES.includes(entry.category))
  .map((entry) => {
    const time = formatTimestamp(entry.event.timestamp)
    const victim = championOf(entry.victim)
    return {
      entry,
      leftPercent: Math.min(100, (entry.event.timestamp / durationMs.value) * 100),
      frameIndex: nearestFrameIndex(frames.value, entry.event.timestamp),
      title: `${time} — ${[championOf(entry.killer), entry.label, victim].filter(Boolean).join(' ')}`,
    }
  }))

const endLabel = computed(() => formatTimestamp(frames.value.at(-1)?.timestamp ?? 0))
const currentLabel = computed(() => formatTimestamp(frames.value[props.currentFrameIndex]?.timestamp ?? 0))

const playheadPercent = computed(() => {
  const frame = frames.value[props.currentFrameIndex]
  if (frame == null) return 0
  return Math.min(100, (frame.timestamp / durationMs.value) * 100)
})

const selectMarker = (marker: Marker) => {
  stopPlay()
  emit('update:currentFrameIndex', marker.frameIndex)
}

const onTrackClick = (event: MouseEvent) => {
  if (frames.value.length < 2) return

  stopPlay()

  const track = event.currentTarget as HTMLElement
  const rect = track.getBoundingClientRect()
  const percent = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  emit('update:currentFrameIndex', nearestFrameIndex(frames.value, percent * durationMs.value))
}

/** The track is a slider: arrows step one minute, Home and End jump to either end. */
const onTrackKeydown = (event: KeyboardEvent) => {
  const last = frames.value.length - 1
  if (last < 1) return

  const targets: Partial<Record<string, number>> = {
    ArrowLeft: props.currentFrameIndex - 1,
    ArrowDown: props.currentFrameIndex - 1,
    ArrowRight: props.currentFrameIndex + 1,
    ArrowUp: props.currentFrameIndex + 1,
    Home: 0,
    End: last,
  }
  const target = targets[event.key]
  if (target === undefined) return

  event.preventDefault()
  stopPlay()
  emit('update:currentFrameIndex', Math.min(last, Math.max(0, target)))
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

<template>
  <div class="px-[22px] pb-5 pt-[18px]">
    <div class="flex items-center gap-3.5">
      <button
        type="button"
        :aria-label="isPlaying ? 'Pause' : 'Lire le film'"
        class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-inverse text-inverse-text transition-transform duration-[250ms] ease-spring hover:scale-[1.08]"
        @click="togglePlay"
      >
        <Icon :name="isPlaying ? 'lucide:pause' : 'lucide:play'" class="size-4" />
      </button>

      <div
        role="slider"
        tabindex="0"
        aria-label="Moment de la partie"
        :aria-valuemin="0"
        :aria-valuemax="Math.max(0, frames.length - 1)"
        :aria-valuenow="currentFrameIndex"
        :aria-valuetext="currentLabel"
        class="relative h-11 flex-1 cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-text-main"
        @click="onTrackClick"
        @keydown="onTrackKeydown"
      >
        <span class="absolute inset-x-0 top-1/2 -mt-1 h-2 rounded-full bg-surface-high" />
        <span
          class="absolute left-0 top-1/2 -mt-1 h-2 rounded-full bg-brand-shell/35 transition-[width] duration-400"
          :style="{ width: `${playheadPercent}%` }"
        />
        <button
          v-for="marker in markers"
          :key="marker.entry.event.id || marker.entry.event.timestamp"
          type="button"
          tabindex="-1"
          :title="marker.title"
          :aria-label="marker.title"
          class="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full ring-[2.5px] ring-surface-base transition-transform duration-200 ease-spring hover:scale-140"
          :class="CATEGORY_DOT_CLASS[marker.entry.category]"
          :style="{ left: `${marker.leftPercent}%` }"
          @click.stop="selectMarker(marker)"
        />
        <span
          v-if="frames.length > 1"
          class="pointer-events-none absolute inset-y-1 -ml-[1.5px] w-[3px] rounded-[3px] bg-text-main transition-[left] duration-400"
          :style="{ left: `${playheadPercent}%` }"
        />
      </div>
    </div>

    <div class="ml-[58px] mt-1.5 flex items-center justify-between font-mono text-xs font-semibold text-text-sec">
      <span>00:00</span>
      <span class="rounded-full bg-inverse px-[9px] py-0.5 text-inverse-text">{{ currentLabel }}</span>
      <span>{{ endLabel }}</span>
    </div>
  </div>
</template>
