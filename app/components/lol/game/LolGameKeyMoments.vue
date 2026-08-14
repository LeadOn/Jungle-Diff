<template>
  <div v-if="moments.length > 0">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="moment in moments"
        :key="moment.key"
        class="rounded-2xl bg-surface-base border border-border-base p-2.5 shadow-sm flex items-center gap-2.5"
      >
        <span
          class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-base"
          :class="iconClass(moment.tone)"
        >
          <img v-if="moment.iconUrl" :src="moment.iconUrl" alt="" class="h-5 w-5 object-contain" />
          <span v-else>{{ moment.icon }}</span>
        </span>

        <div class="min-w-0 flex-1">
          <p class="text-text-main truncate text-[13px] font-semibold">
            {{ moment.title }}
          </p>
          <p
            class="text-text-ter truncate text-[11px]"
            :title="moment.detail"
          >
            {{ moment.detail }}
          </p>
        </div>

        <span
          class="font-heading shrink-0 text-xs font-bold"
          :class="timeClass(moment.tone)"
        >
          {{ moment.timeLabel }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import { keyMoments } from '~/utils/lol-key-moments'
import type { KeyMomentTone } from '~/utils/lol-key-moments'

const props = defineProps<{
  players: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  winningTeamId: number | null
}>()

const moments = computed(() => keyMoments(props.timeline, props.players, props.winningTeamId))

const TONE_ICON_CLASSES: Record<KeyMomentTone, string> = {
  red: 'bg-brand-red/15 border-brand-red/30',
  blue: 'bg-blue-400/15 border-blue-400/30',
  yellow: 'bg-brand-gold/15 border-brand-gold/30',
  green: 'bg-brand-green/15 border-brand-green/30',
}

const TONE_TIME_CLASSES: Record<KeyMomentTone, string> = {
  red: 'text-brand-red',
  blue: 'text-blue-400',
  yellow: 'text-brand-gold',
  green: 'text-brand-green',
}

const iconClass = (tone: KeyMomentTone) => TONE_ICON_CLASSES[tone]
const timeClass = (tone: KeyMomentTone) => TONE_TIME_CLASSES[tone]
</script>
