<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { LadderEntry } from '~/utils/lol-ladder'
import { usePatchStore } from '~/stores/patch'
import { getProfileIconUrl } from '~/utils/ddragon'
import { TIER_ORDER, TIER_SPAN, tierEmblemUrl, tierLabel, tierTint, trackScore } from '~/utils/lol-tier'
import { formatSigned } from '~/utils/number'

/**
 * "L'échelle des rangs": every ranked player placed on one continuous axis (`trackScore`), over
 * tier-tinted bands (`--tier`), with a trail back to where they stood 7 days ago (`lpChange7Days*`).
 *
 * Players too close to share a line are pushed onto extra lanes, which needs the real width of the
 * track: it is measured after mount with `ResizeObserver`, and the server renders with a nominal
 * width (`640`) so SSR and hydration agree.
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

const trackWidth = computed(() => width.value || 640)

/** Each ranked entry with its position now and 7 days ago, both on the banded `trackScore` axis. */
const placed = computed(() => props.entries.flatMap((entry) => {
  const now = entry.rank ? trackScore(entry.rank) : null
  const before = entry.rank ? trackScore(entry.rank, -entry.delta) : null
  return now === null || before === null ? [] : [{ entry, now, before }]
}))

const bounds = computed(() => {
  const points = placed.value.flatMap(({ now, before }) => [now, before])
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
      tier,
      style: {
        left: `${toX(score)}%`,
        width: `${bandWidth}%`,
        '--tier': tierTint(tier) ?? 'var(--tier-none)',
      },
      emblem: tierEmblemUrl({ tier }),
      label: tier.charAt(0) + tier.slice(1).toLowerCase(),
    })
  }
  return result
})

const summaryLabel = computed(() => {
  return [...bands.value].reverse().map((band) => {
    const names = placed.value
      .filter(({ entry }) => {
        const t = entry.rank?.tier
        if (!t) return false
        if (band.tier === 'MASTER') return ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(t)
        return t === band.tier
      })
      .map(({ entry }) => entry.name)
    return names.length ? `${band.label} : ${names.join(', ')}` : ''
  }).filter(Boolean).join('. ')
})

const laneTop = (lane: number) => 42 + lane * 34

/** Greedy lane assignment, left to right: a dot goes on the first lane it does not collide on. */
const lanes = computed(() => {
  const gapPct = (36 / trackWidth.value) * 100
  const ends: number[] = []
  const laneOf = new Map<number, number>()
  const byPosition = [...placed.value].sort((a, b) => a.now - b.now)
  for (const { entry, now } of byPosition) {
    const left = toX(now)
    let lane = ends.findIndex(last => left - last > gapPct)
    if (lane === -1) {
      ends.push(left)
      lane = ends.length - 1
    } else {
      ends[lane] = left
    }
    laneOf.set(entry.id, lane)
  }
  return { laneOf, count: Math.max(1, ends.length) }
})

const dots = computed(() => placed.value.map(({ entry, now, before }) => {
  const hovered = props.hoveredId === entry.id
  const lane = lanes.value.laneOf.get(entry.id) ?? 0
  const top = laneTop(lane)
  const previousX = toX(before)
  const x = toX(now)
  const isMe = props.meId === entry.id
  const isFirst = entry.position === 1
  const tierVar = tierTint(entry.rank?.tier) ?? 'var(--tier-none)'
  return {
    entry,
    hovered,
    isMe,
    isFirst,
    label: `${entry.name}${entry.rank ? `, ${tierLabel(entry.rank)} ${entry.rank.leaguePoints} LP` : ''}`,
    detail: `${tierLabel(entry.rank)} · ${entry.rank?.leaguePoints ?? 0} LP · 7 j ${formatSigned(entry.delta)}`,
    iconUrl: entry.iconId != null ? getProfileIconUrl(entry.iconId, patchStore.currentPatch) : null,
    style: {
      left: `${x}%`,
      top: `${top}px`,
      '--tier': tierVar,
      zIndex: hovered ? 5 : 2,
    },
    trail: entry.delta !== 0
      ? {
          kind: entry.delta > 0 ? 'up' : 'down',
          style: {
            top: `${top + 12}px`,
            left: `${Math.min(previousX, x)}%`,
            width: `${Math.abs(x - previousX)}%`,
          },
        }
      : null,
  }
}))

const height = computed(() => 52 + lanes.value.count * 34)
</script>

<template>
  <section
    aria-label="L'échelle des rangs"
    class="rscale-card overflow-hidden rounded-5 border border-line/70 bg-surface shadow-card"
  >
    <div class="flex flex-wrap items-baseline justify-between gap-3 px-4 pb-2.5 pt-3.5">
      <h3 class="type-title">L'échelle des rangs</h3>
      <span class="type-small text-ink-2">Le trait montre la progression sur 7 jours</span>
    </div>

    <div
      ref="track"
      role="img"
      :aria-label="summaryLabel"
      class="rscale"
      :style="{ height: `${height}px` }"
    >
      <span
        v-for="band in bands"
        :key="band.key"
        class="scale-band"
        :style="band.style"
      >
        <span class="scale-name">
          <img :src="band.emblem" alt="">
          <b>{{ band.label }}</b>
        </span>
      </span>

      <template v-for="dot in dots" :key="`trail-${dot.entry.id}`">
        <span
          v-if="dot.trail"
          class="scale-trail"
          :class="dot.trail.kind"
          :style="dot.trail.style"
        />
      </template>

      <NuxtLink
        v-for="dot in dots"
        :key="dot.entry.id"
        :to="`/summoner/${dot.entry.id}`"
        :data-flip-id="`dot-${dot.entry.id}`"
        :aria-label="dot.label"
        :title="`${dot.entry.name} · ${tierLabel(dot.entry.rank)} ${dot.entry.rank?.leaguePoints ?? 0} LP`"
        class="scale-dot"
        :class="{ first: dot.isFirst, me: dot.isMe }"
        :style="dot.style"
        @mouseenter="emit('hover', dot.entry.id)"
        @mouseleave="emit('hover', null)"
        @focus="emit('hover', dot.entry.id)"
        @blur="emit('hover', null)"
      >
        <img v-if="dot.iconUrl" :src="dot.iconUrl" alt="">
        <span v-else class="dot-fallback" />
        <b>{{ dot.entry.position }}</b>
        <span
          v-if="dot.hovered"
          role="tooltip"
          class="pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-[6] -translate-x-1/2 grid gap-0.5 whitespace-nowrap rounded-2 bg-night px-2.5 py-2 text-[13px] text-on-night shadow-float"
        >
          <span class="font-[640]">{{ dot.entry.name }}{{ dot.isMe ? ' · vous' : '' }}</span>
          <span class="font-mono text-[11px] text-on-night-2">{{ dot.detail }}</span>
        </span>
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.rscale {
  position: relative;
  margin: 0 14px 16px;
}

.scale-band {
  position: absolute;
  top: 0;
  bottom: 0;
}

.scale-band::before {
  content: "";
  position: absolute;
  inset: 0 2px;
  border-radius: var(--radius-3);
  background: color-mix(in oklch, var(--tier) 30%, var(--surface));
  border: 1px solid color-mix(in oklch, var(--tier) 42%, transparent);
}

.scale-name {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 8px 10px 0;
}

.scale-name img {
  width: 20px;
  height: 20px;
  flex: none;
  object-fit: contain;
}

.scale-name b {
  font-size: 0.75rem;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scale-trail {
  position: absolute;
  z-index: 1;
  height: 6px;
  border-radius: 3px;
}

.scale-trail.up {
  background: var(--win);
  opacity: 0.45;
}

.scale-trail.down {
  background: var(--loss);
  opacity: 0.45;
}

.scale-dot {
  position: absolute;
  z-index: 2;
  display: block;
  width: 30px;
  height: 30px;
  margin-left: -15px;
}

.scale-dot.moving {
  z-index: 3;
}

.scale-dot img,
.scale-dot .dot-fallback {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  background: var(--sunken);
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 3.5px var(--tier, var(--line-strong));
}

.scale-dot > b {
  position: absolute;
  right: -6px;
  bottom: -5px;
  min-width: 17px;
  height: 17px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--night);
  color: var(--on-night);
  font-family: var(--font-mono);
  font-size: 9.5px;
  font-weight: 600;
  line-height: 17px;
  text-align: center;
}

.scale-dot.first img,
.scale-dot.first .dot-fallback,
.scale-dot.me img,
.scale-dot.me .dot-fallback {
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--gold);
}

.scale-dot.first > b {
  background: var(--gold);
  color: var(--on-tier);
}

@container ladder (max-width: 520px) {
  .scale-name {
    justify-content: center;
    padding-inline: 0;
  }

  .scale-name b {
    display: none;
  }
}
</style>
