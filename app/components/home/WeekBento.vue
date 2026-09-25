<script setup lang="ts">
import { computed } from 'vue'
import type { LoLWeeklyActivityDto } from '~/lib/types'
import { usePatchStore } from '~/stores/patch'
import { useAnimatedNumber } from '~/composables/useAnimatedNumber'
import { useEntered } from '~/composables/useEntered'
import { championSplashUrl } from '~/utils/lol-champion'
import { getProfileIconUrl } from '~/utils/ddragon'
import { playerDisplayName } from '~/utils/lol-ladder'
import { describeDay, parisDayKey } from '~/utils/date'
import { computeWinRate, formatDecimal, formatSigned } from '~/utils/number'

/**
 * `weeklyActivity` as the home page asks for it: the last 7 days (`window=Last7Days`, six days ago
 * 00:00 Paris time to now) against the 7 days before, **ranked games only** (Solo/Duo and Flex).
 */
const props = defineProps<{
  activity: LoLWeeklyActivityDto
  /** Accounts the dashboard is counting, the denominator of "joueurs actifs". */
  crewSize: number
}>()

const patchStore = usePatchStore()
const entered = useEntered()

const games = useAnimatedNumber(() => props.activity.gamesThisWeek)
const winRateValue = useAnimatedNumber(() => props.activity.winRateThisWeek)
const netLp = useAnimatedNumber(() => props.activity.netLpChangeThisWeek)
const hours = useAnimatedNumber(() => props.activity.totalPlaytimeMinutesThisWeek / 60)

const gamesDelta = computed(() => props.activity.gamesThisWeek - props.activity.gamesLastWeek)

const RING_RADIUS = 46
const RING_LENGTH = 2 * Math.PI * RING_RADIUS
const winShare = computed(() => {
  const played = props.activity.winsThisWeek + props.activity.lossesThisWeek
  return played > 0 ? props.activity.winsThisWeek / played : 0
})
const ringDash = computed(() => `${(entered.value ? winShare.value : 0) * RING_LENGTH} ${RING_LENGTH}`)

/** In points against the previous 7 days; absent when nothing was played back then. */
const winRateDelta = computed(() => {
  const { winsLastWeek, lossesLastWeek } = props.activity
  if (winsLastWeek === undefined || lossesLastWeek === undefined) return null
  const previous = computeWinRate(winsLastWeek, lossesLastWeek)
  if (previous === null) return null
  const delta = Math.round(props.activity.winRateThisWeek - previous)
  return {
    text: `${formatSigned(delta)} pts`,
    title: `Par rapport aux 7 jours précédents (${previous} %)`,
    class: delta > 0 ? 'text-brand-green' : delta < 0 ? 'text-brand-red' : 'text-text-sec',
  }
})

const lpTone = computed(() => {
  if (props.activity.netLpChangeThisWeek > 0) return 'text-brand-green'
  if (props.activity.netLpChangeThisWeek < 0) return 'text-brand-red'
  return 'text-text-main'
})

const averageDuration = computed(() => `${Math.round(props.activity.averageGameDurationMinutesThisWeek)} min / partie`)

const activePlayers = computed(() => (props.activity.activePlayers ?? []).slice(0, 5).map(active => ({
  id: active.player.id,
  title: `${playerDisplayName(active.player)} · ${active.games} partie${active.games > 1 ? 's' : ''}`,
  iconStyle: active.player.lolIconId != null
    ? { backgroundImage: `url('${getProfileIconUrl(active.player.lolIconId, patchStore.currentPatch)}')` }
    : {},
})))
const activeText = computed(() => {
  const count = props.activity.activePlayers?.length ?? 0
  return `${count} joueur${count > 1 ? 's' : ''} actif${count > 1 ? 's' : ''} sur ${props.crewSize}`
})

// The API's own clock decides which day is "today", not the reader's: the two only differ around
// midnight, and the data is what the labels describe.
const todayKey = computed(() => parisDayKey(props.activity.windowEnd ?? Date.now()))

const days = computed(() => {
  const list = props.activity.days ?? []
  const maxLp = Math.max(...list.map(day => Math.abs(day.netLpChange ?? 0)), 1)
  const maxMinutes = Math.max(...list.map(day => day.playtimeMinutes), 1)

  return list.map((day, index) => {
    const label = describeDay(day.date, todayKey.value)
    const lp = day.netLpChange
    const record = `${day.games} partie${day.games > 1 ? 's' : ''}`
    // A genuine 0 is a flat tick on the baseline; unknown LP (`null`) draws nothing at all.
    const barHeight = entered.value && lp !== null ? Math.max(3, (Math.abs(lp) / maxLp) * 46) : 0
    return {
      key: day.date,
      initial: label.initial,
      isToday: label.isToday,
      lpTitle: lp === null ? `${label.title} · LP inconnus` : `${label.title} · ${formatSigned(lp)} LP · ${record}`,
      barStyle: {
        top: `${lp !== null && lp < 0 ? 50 : 50 - barHeight}%`,
        height: `${barHeight}%`,
        transitionDelay: `${index * 60}ms`,
      },
      barClass: lp === null || lp === 0 ? 'bg-text-ter' : lp > 0 ? 'bg-win' : 'bg-loss',
      heatTitle: `${label.title} · ${formatDecimal(day.playtimeMinutes / 60)} h · ${record}`,
      heatStyle: {
        opacity: entered.value ? 0.12 + 0.88 * (day.playtimeMinutes / maxMinutes) : 0,
        transform: `scale(${entered.value ? 1 : 0.4})`,
        transitionDelay: `${index * 60}ms`,
      },
    }
  })
})

const heroBackdrop = { backgroundImage: `url('${championSplashUrl('Rammus')}')` }
</script>

<template>
  <div class="grid grid-flow-row-dense grid-cols-2 gap-4 md:grid-cols-3 rail:grid-cols-[1.35fr_1fr_1fr_1fr]">
    <!-- Hero: games played -->
    <div class="relative col-span-2 flex min-h-[212px] animate-rise flex-col overflow-hidden rounded-[26px] bg-ink px-6 py-[22px] text-white shadow-hero text-shadow-photo md:col-span-3 rail:col-span-1">
      <div aria-hidden="true" class="absolute inset-0 bg-cover bg-[position:right_20%] bg-no-repeat" :style="heroBackdrop" />
      <div aria-hidden="true" class="absolute inset-0 bg-scrim-side" />
      <img src="~/assets/img/JungleDiff_Logo.png" alt="" aria-hidden="true" class="pointer-events-none absolute right-3.5 top-3.5 size-[100px] animate-bob object-contain drop-shadow-xl">

      <div class="relative text-[15px] font-bold text-white/78">Sur 7 jours, le crew a joué</div>
      <div class="relative mt-1.5 flex items-baseline gap-2.5">
        <span class="text-[56px] font-bold leading-none tracking-[-0.05em] md:text-[68px] rail:text-[76px]">{{ Math.round(games) }}</span>
        <span class="text-[22px] font-bold">parties classées</span>
      </div>
      <div class="relative mt-3.5 flex flex-wrap gap-2">
        <span class="rounded-full border border-signal/35 bg-signal/16 px-3 py-[5px] text-[13px] font-bold text-on-photo-green">
          {{ formatSigned(gamesDelta) }} vs les 7 jours précédents
        </span>
      </div>
      <div v-if="activePlayers.length > 0" class="relative mt-auto flex items-center gap-3 pt-5">
        <span class="flex">
          <span
            v-for="(player, index) in activePlayers"
            :key="player.id"
            :title="player.title"
            class="size-[30px] rounded-full border-2 border-ink bg-surface-sunken bg-cover bg-center"
            :class="index > 0 ? '-ml-2' : ''"
            :style="player.iconStyle"
          />
        </span>
        <span class="text-[13px] font-semibold text-white/78" title="Au moins une partie classée sur 7 jours">{{ activeText }}</span>
      </div>
    </div>

    <!-- Win rate -->
    <div class="tile [animation-delay:80ms]">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-sm font-bold">Taux de victoire</span>
        <span v-if="winRateDelta" :title="winRateDelta.title" class="whitespace-nowrap text-xs font-bold" :class="winRateDelta.class">{{ winRateDelta.text }}</span>
      </div>
      <div class="flex flex-1 flex-wrap items-center gap-x-4 gap-y-3">
        <div class="relative size-[104px] shrink-0">
          <svg viewBox="0 0 104 104" class="size-full -rotate-90" aria-hidden="true">
            <circle cx="52" cy="52" :r="RING_RADIUS" fill="none" stroke-width="12" class="stroke-loss-track" />
            <circle
              cx="52"
              cy="52"
              :r="RING_RADIUS"
              fill="none"
              stroke-width="12"
              class="stroke-win transition-[stroke-dasharray] duration-[1300ms] ease-out-expo"
              :stroke-dasharray="ringDash"
            />
          </svg>
          <span class="absolute inset-0 flex items-center justify-center text-2xl font-bold tracking-[-0.03em]">{{ Math.round(winRateValue) }}%</span>
        </div>
        <div class="flex flex-col gap-2 text-[13px] font-semibold">
          <span class="flex items-center gap-[7px] whitespace-nowrap"><span class="size-[9px] rounded-full bg-win" />{{ activity.winsThisWeek }} victoires</span>
          <span class="flex items-center gap-[7px] whitespace-nowrap"><span class="size-[9px] rounded-full bg-loss-track" />{{ activity.lossesThisWeek }} défaites</span>
        </div>
      </div>
    </div>

    <!-- LP -->
    <div class="tile [animation-delay:160ms]">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-sm font-bold">LP gagnés ensemble</span>
        <span class="whitespace-nowrap text-xs font-bold text-text-sec">Solo + Flex</span>
      </div>
      <div class="flex items-baseline gap-1.5" :class="lpTone">
        <span class="text-[46px] font-bold leading-none tracking-[-0.05em]">{{ formatSigned(Math.round(netLp)) }}</span>
        <span class="text-base font-bold">LP</span>
      </div>
      <div v-if="days.length > 0" class="grid min-h-16 flex-1 grid-cols-7 gap-1.5">
        <div v-for="day in days" :key="day.key" :title="day.lpTitle" class="flex cursor-default flex-col items-center gap-1.5">
          <div class="relative min-h-11 w-full flex-1">
            <span class="absolute -inset-x-[3px] top-1/2 h-px bg-border-accent" />
            <span
              class="absolute inset-x-[16%] rounded transition-[top,height] duration-[800ms] ease-spring-soft"
              :class="day.barClass"
              :style="day.barStyle"
            />
          </div>
          <span class="text-[11px] font-bold" :class="day.isToday ? 'text-text-main' : 'text-text-sec'">{{ day.initial }}</span>
        </div>
      </div>
    </div>

    <!-- Playtime -->
    <div class="tile col-span-2 [animation-delay:240ms] md:col-span-1">
      <div class="flex items-baseline justify-between gap-2">
        <span class="text-sm font-bold">Temps de jeu</span>
        <span class="whitespace-nowrap text-xs font-bold text-text-sec">{{ averageDuration }}</span>
      </div>
      <div class="flex items-baseline gap-1.5">
        <span class="text-[46px] font-bold leading-none tracking-[-0.05em]">{{ Math.round(hours) }}</span>
        <span class="text-base font-bold">h</span>
      </div>
      <div v-if="days.length > 0" class="grid flex-1 grid-cols-7 items-end gap-1.5">
        <div v-for="day in days" :key="day.key" :title="day.heatTitle" class="flex cursor-default flex-col items-center gap-1.5">
          <span
            class="aspect-square w-full max-w-[30px] rounded-lg bg-brand-link transition-[opacity,transform] duration-500 ease-spring"
            :style="day.heatStyle"
          />
          <span class="text-[11px] font-bold" :class="day.isToday ? 'text-text-main' : 'text-text-sec'">{{ day.initial }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.tile {
  @apply relative flex min-h-[212px] animate-rise flex-col gap-3.5 rounded-[26px] border border-border-subtle bg-surface-base p-5 shadow-card transition-[translate,box-shadow] duration-[350ms] ease-spring hover:-translate-y-1 hover:shadow-card-hover;
}
</style>
