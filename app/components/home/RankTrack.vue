<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { LadderEntry } from '~/utils/lol-ladder'
import { usePatchStore } from '~/stores/patch'
import { useEntered } from '~/composables/useEntered'
import { getProfileIconUrl } from '~/utils/ddragon'
import { TIER_ORDER, TIER_SPAN, tierEmblemUrl, tierLabel, tierTint } from '~/utils/lol-tier'
import { formatSigned } from '~/utils/number'

/**
 * "L'échelle des rangs": every ranked player placed on one continuous axis (`rankScore`), over
 * pastel tier bands, with a trail back to where they stood 7 days ago (`lpChange7Days*`).
 *
 * Players too close to share a line are pushed onto extra lanes, which needs the real width of the
 * track: it is measured after mount, and the server renders with a nominal one.
 */

const props = defineProps<{
  entries: LadderEntry[]
  hoveredId: number | null
  meId: number | null
}>()

const emit = defineEmits<{
  (e: 'hover', id: number | null): void
}>()

const patchStore = usePatchStore()
const entered = useEntered()

const track = ref<HTMLElement | null>(null)
const width = ref(0)
let observer: ResizeObserver | null = null

onMounted(() => {
  if (!track.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    const measured = Math.round(entry?.contentRect.width ?? 0)
    if (Math.abs(measured - width.value) > 2) width.value = measured
  })
  observer.observe(track.value)
})
onBeforeUnmount(() => observer?.disconnect())

const trackWidth = computed(() => width.value || 700)
const dotSize = computed(() => (trackWidth.value >= 520 ? 36 : 30))

const placed = computed(() => props.entries.filter(entry => entry.score !== null))

const bounds = computed(() => {
  const points = placed.value.flatMap(entry => [entry.score!, entry.score! - entry.delta])
  if (points.length === 0) return { low: 800, high: 2000 }
  return {
    low: Math.floor(Math.min(...points) / TIER_SPAN) * TIER_SPAN,
    high: (Math.floor(Math.max(...points) / TIER_SPAN) + 1) * TIER_SPAN,
  }
})

/** Percentage along the track. */
const toX = (score: number) => {
  const { low, high } = bounds.value
  return Math.max(0, Math.min(100, ((score - low) / (high - low)) * 100))
}

const bands = computed(() => {
  const { low, high } = bounds.value
  const bandWidth = (TIER_SPAN / (high - low)) * 100
  const result = []
  for (let score = low; score < high; score += TIER_SPAN) {
    const tier = TIER_ORDER[Math.min(TIER_ORDER.length - 1, score / TIER_SPAN)] ?? 'MASTER'
    result.push({
      key: score,
      style: { left: `${toX(score)}%`, width: `${bandWidth}%` },
      fill: { backgroundColor: tierTint(tier) ?? undefined },
      emblem: tierEmblemUrl({ tier }),
      label: tier.charAt(0) + tier.slice(1).toLowerCase(),
      showLabel: (bandWidth / 100) * trackWidth.value > 104,
    })
  }
  return result
})

const railY = computed(() => 40 + dotSize.value / 2)
const laneStep = computed(() => dotSize.value + 14)

/** Greedy lane assignment, left to right: a dot goes on the first lane it does not collide on. */
const lanes = computed(() => {
  const ends: number[] = []
  const laneOf = new Map<number, number>()
  const byPosition = [...placed.value].sort((a, b) => toX(a.score!) - toX(b.score!))
  for (const entry of byPosition) {
    const px = (toX(entry.score!) / 100) * trackWidth.value
    let lane = 0
    while (ends[lane] !== undefined && px - ends[lane]! < dotSize.value + 10) lane++
    ends[lane] = px
    laneOf.set(entry.id, lane)
  }
  return { laneOf, count: Math.max(1, ends.length) }
})

const isDimmed = (id: number) => props.hoveredId !== null && props.hoveredId !== id
  && placed.value.some(entry => entry.id === props.hoveredId)

const dots = computed(() => placed.value.map((entry, index) => {
  const hovered = props.hoveredId === entry.id
  const top = railY.value + (lanes.value.laneOf.get(entry.id) ?? 0) * laneStep.value
  const previousX = toX(entry.score! - entry.delta)
  const x = toX(entry.score!)
  const isMe = props.meId === entry.id
  return {
    entry,
    hovered,
    isMe,
    label: `${entry.name}${entry.rank ? `, ${tierLabel(entry.rank)} ${entry.rank.leaguePoints} LP` : ''}`,
    detail: `${tierLabel(entry.rank)} · ${entry.rank?.leaguePoints ?? 0} LP · 7 j ${formatSigned(entry.delta)}`,
    style: {
      left: `${entered.value ? x : 0}%`,
      top: `${top}px`,
      width: `${dotSize.value}px`,
      height: `${dotSize.value}px`,
      zIndex: hovered ? 5 : 2,
      opacity: isDimmed(entry.id) ? 0.35 : 1,
      transform: `translate(-50%, -50%) scale(${hovered ? 1.18 : 1})`,
      transitionDelay: `${index * 70}ms, 0ms, 0ms, 0ms`,
    },
    avatarStyle: entry.iconId != null
      ? { backgroundImage: `url('${getProfileIconUrl(entry.iconId, patchStore.currentPatch)}')` }
      : {},
    trail: {
      class: entry.delta >= 0 ? 'bg-win' : 'bg-loss',
      style: {
        left: `${entered.value ? Math.min(previousX, x) : 0}%`,
        width: `${entered.value ? Math.abs(x - previousX) : 0}%`,
        top: `${top}px`,
        opacity: !entered.value || entry.delta === 0 ? 0 : isDimmed(entry.id) ? 0.25 : 1,
      },
      startStyle: {
        left: `${entered.value ? previousX : 0}%`,
        top: `${top}px`,
        opacity: !entered.value || entry.delta === 0 ? 0 : isDimmed(entry.id) ? 0.25 : 1,
      },
    },
  }
}))

const height = computed(() => railY.value + (lanes.value.count - 1) * laneStep.value + dotSize.value / 2 + 14)
</script>

<template>
  <div class="mt-[22px] rounded-3xl border border-border-base bg-surface-base px-[22px] pb-4 pt-[18px] shadow-card">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-3.5 gap-y-1.5">
      <span class="text-[17px] font-bold tracking-[-0.02em]">L'échelle des rangs</span>
      <span class="text-[12.5px] font-semibold text-text-sec">Le trait = progression sur 7 jours</span>
    </div>
    <div ref="track" class="relative transition-[height] duration-500 ease-spring" :style="{ height: `${height}px` }">
      <div
        v-for="band in bands"
        :key="band.key"
        class="absolute inset-y-0 px-0.5 transition-[left,width] duration-[800ms] ease-spring-soft"
        :style="band.style"
      >
        <div class="h-full rounded-[14px] opacity-[0.26]" :style="band.fill" />
        <div class="absolute left-2 right-1 top-[5px] flex h-[26px] items-center gap-[5px] overflow-hidden whitespace-nowrap text-xs font-bold">
          <img :src="band.emblem" alt="" class="size-[26px] shrink-0 object-contain">
          <span v-if="band.showLabel">{{ band.label }}</span>
        </div>
      </div>

      <template v-for="dot in dots" :key="`trail-${dot.entry.id}`">
        <span
          class="absolute -mt-[3px] h-1.5 rounded-md border border-border-accent transition-[left,width,top,opacity] duration-[900ms] ease-spring-soft"
          :class="dot.trail.class"
          :style="dot.trail.style"
        />
        <span
          class="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border-base bg-surface-base transition-[left,top,opacity] duration-[900ms] ease-spring-soft"
          :style="dot.trail.startStyle"
        />
      </template>

      <NuxtLink
        v-for="dot in dots"
        :key="dot.entry.id"
        :to="`/summoner/${dot.entry.id}`"
        :aria-label="dot.label"
        class="absolute transition-[left,top,transform,opacity] duration-[900ms,500ms,250ms,300ms] ease-spring-soft"
        :style="dot.style"
        @mouseenter="emit('hover', dot.entry.id)"
        @mouseleave="emit('hover', null)"
        @focus="emit('hover', dot.entry.id)"
        @blur="emit('hover', null)"
      >
        <span
          class="absolute inset-0 rounded-full border-[2.5px] bg-surface-base bg-cover bg-center shadow-md"
          :class="dot.isMe ? 'border-brand-gold-bright' : 'border-surface-base'"
          :style="dot.avatarStyle"
        />
        <span
          class="absolute -bottom-1.5 -right-[7px] flex h-[19px] min-w-[19px] items-center justify-center rounded-full border border-border-accent px-1 text-[10.5px] font-bold leading-none"
          :class="dot.entry.position === 1 ? 'bg-brand-gold-bright text-ink' : 'bg-surface-base'"
        >{{ dot.entry.position }}</span>
        <span
          v-if="dot.hovered"
          role="tooltip"
          class="pointer-events-none absolute bottom-[calc(100%+12px)] left-1/2 z-[6] -translate-x-1/2 animate-pop whitespace-nowrap rounded-[14px] bg-ink px-3 py-2 text-ink-text"
        >
          <span class="block text-[13px] font-bold">{{ dot.entry.name }}{{ dot.isMe ? ' · vous' : '' }}</span>
          <span class="mt-0.5 block font-mono text-[11px] text-on-photo-green">{{ dot.detail }}</span>
        </span>
      </NuxtLink>
    </div>
  </div>
</template>
