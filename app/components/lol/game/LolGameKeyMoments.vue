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

/** One wash per tone, shared by the icon tile and the time pill. */
const TONE_CLASSES: Record<KeyMomentTone, string> = {
  red: 'bg-loss-soft text-brand-red',
  blue: 'bg-team-blue-soft text-team-blue-text',
  yellow: 'bg-brand-gold-soft text-brand-gold',
  green: 'bg-win-soft text-brand-green',
}
</script>

<template>
  <section v-if="moments.length > 0" aria-labelledby="game-moments">
    <h2 id="game-moments" class="sr-only">Moments clés</h2>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-3">
      <div
        v-for="(moment, index) in moments"
        :key="moment.key"
        class="flex animate-rise items-center gap-3 rounded-[20px] border border-border-subtle bg-surface-base px-3.5 py-3 shadow-card transition-transform duration-300 ease-spring hover:-translate-y-[3px]"
        :style="{ animationDelay: `${120 + index * 50}ms` }"
      >
        <span
          class="flex size-10 shrink-0 items-center justify-center rounded-[13px] font-mono text-[11px] font-semibold"
          :class="TONE_CLASSES[moment.tone]"
        >
          <span v-if="moment.iconUrl" class="flex size-[26px] items-center justify-center rounded-full bg-ink">
            <UiAppImage :src="moment.iconUrl" alt="" class="size-[17px] object-contain" />
          </span>
          <template v-else>{{ moment.glyph }}</template>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-[14.5px] font-bold">{{ moment.title }}</span>
          <span :title="moment.detail" class="mt-px block truncate text-xs font-semibold text-text-sec">{{ moment.detail }}</span>
        </span>
        <span
          class="shrink-0 rounded-full px-[9px] py-[3px] font-mono text-xs font-semibold"
          :class="TONE_CLASSES[moment.tone]"
        >{{ moment.timeLabel }}</span>
      </div>
    </div>
  </section>
</template>
