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

/** One wash per tone, on the icon tile only: the time beside it stays a neutral mono figure. */
const TONE_CLASSES: Record<KeyMomentTone, string> = {
  red: 'bg-loss-soft text-loss-ink',
  blue: 'bg-side-blue-soft text-side-blue-ink',
  yellow: 'bg-gold-soft text-gold-ink',
  green: 'bg-win-soft text-win-ink',
}
</script>

<template>
  <section v-if="moments.length > 0" aria-labelledby="game-moments">
    <h2 id="game-moments" class="sr-only">Moments clés</h2>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(min(250px,100%),1fr))] gap-3">
      <div
        v-for="moment in moments"
        :key="moment.key"
        class="flex items-center gap-3 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface px-3.5 py-3 shadow-card"
      >
        <span
          class="type-mono flex size-10 shrink-0 items-center justify-center rounded-3 text-[11px] font-semibold"
          :class="TONE_CLASSES[moment.tone]"
        >
          <span v-if="moment.iconUrl" class="flex size-[26px] items-center justify-center rounded-full bg-night">
            <UiAppImage :src="moment.iconUrl" alt="" class="size-[17px] object-contain" />
          </span>
          <template v-else>{{ moment.glyph }}</template>
        </span>
        <span class="min-w-0 flex-1">
          <span class="block text-[0.875rem] font-[640] text-ink">{{ moment.title }}</span>
          <span :title="moment.detail" class="type-small mt-px block truncate text-ink-2">{{ moment.detail }}</span>
        </span>
        <span class="type-mono shrink-0 rounded-1 bg-neutral-soft px-1.5 py-0.5 text-ink-2">{{ moment.timeLabel }}</span>
      </div>
    </div>
  </section>
</template>
