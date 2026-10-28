<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LoLWeeklyActivityDto } from '~/lib/types'
import { usePatchStore } from '~/stores/patch'
import { getProfileIconUrl } from '~/utils/ddragon'
import { playerDisplayName } from '~/utils/lol-ladder'
import { parisDayKey } from '~/utils/date'
import { computeWinRate, formatDecimal, formatSigned } from '~/utils/number'

/**
 * `weeklyActivity` as the home page asks for it: the last 7 days (`window=Last7Days`, six days ago
 * 00:00 Paris time to now) against the 7 days before, **ranked games only** (Solo/Duo and Flex).
 *
 * Rendered as the Canopée week ledger: a 7-day + total table above 760 px container width, and a
 * 2×2 summary + per-day rows below 760 px. Degrades to the 2×2 summary alone when `days` is absent.
 */
const props = defineProps<{
  activity: LoLWeeklyActivityDto
  /** Accounts the dashboard is counting, the denominator of "joueurs actifs". */
  crewSize: number
}>()

const patchStore = usePatchStore()
const hoveredDay = ref<string | null>(null)

const weekdayShortFormat = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'short' })

const gamesDelta = computed(() => props.activity.gamesThisWeek - props.activity.gamesLastWeek)
const totalHours = computed(() => formatDecimal(props.activity.totalPlaytimeMinutesThisWeek / 60))
const averageDuration = computed(() => `${Math.round(props.activity.averageGameDurationMinutesThisWeek)} min par partie`)

/** In points against the previous 7 days; absent when nothing was played back then. */
const winRateDelta = computed(() => {
  const { winsLastWeek, lossesLastWeek } = props.activity
  if (winsLastWeek === undefined || lossesLastWeek === undefined) return null
  const previous = computeWinRate(winsLastWeek, lossesLastWeek)
  if (previous === null) return null
  const delta = Math.round(props.activity.winRateThisWeek - previous)
  return {
    text: `${formatSigned(delta)} pts`,
    title: `${winsLastWeek + lossesLastWeek} parties les 7 jours précédents (${previous} %)`,
    class: delta > 0 ? 'text-win-ink' : delta < 0 ? 'text-loss-ink' : 'text-ink-3',
  }
})

const lpTone = computed(() => {
  if (props.activity.netLpChangeThisWeek > 0) return 'text-win-ink'
  if (props.activity.netLpChangeThisWeek < 0) return 'text-loss-ink'
  return 'text-ink-3'
})

const activePlayers = computed(() => (props.activity.activePlayers ?? []).slice(0, 8).map(active => ({
  id: active.player.id,
  name: playerDisplayName(active.player),
  title: `${playerDisplayName(active.player)} · ${active.games} partie${active.games > 1 ? 's' : ''}`,
  iconUrl: active.player.lolIconId != null
    ? getProfileIconUrl(active.player.lolIconId, patchStore.currentPatch)
    : null,
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
  if (list.length === 0) return []
  const maxLp = Math.max(...list.map(day => Math.abs(day.netLpChange ?? 0)), 1)
  const maxMinutes = Math.max(...list.map(day => day.playtimeMinutes), 1)

  return list.map((day) => {
    const [year, month, dayNum] = day.date.split('-').map(Number)
    const utcNoon = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, dayNum ?? 1, 12))
    const wd = weekdayShortFormat.format(utcNoon).toLowerCase()
    const num = String(dayNum ?? '')
    const isToday = day.date === todayKey.value
    const lp = day.netLpChange
    const winPct = day.games > 0 ? (day.wins * 100) / day.games : 0
    const timePct = maxMinutes > 0 ? (day.playtimeMinutes * 100) / maxMinutes : 0
    const lpPct = lp !== null && lp !== 0 ? (Math.abs(lp) / maxLp) * 50 : 0

    return {
      key: day.date,
      wd,
      num,
      label: `${wd} ${num}`,
      isToday,
      games: day.games,
      wins: day.wins,
      losses: day.losses,
      winPct,
      lp,
      lpPct,
      lpToneClass: lp === null || lp === 0 ? 'text-ink-3' : lp > 0 ? 'text-win-ink' : 'text-loss-ink',
      lpBarKind: lp === null ? null : lp > 0 ? 'up' : lp < 0 ? 'down' : 'zero',
      timePct,
      hours: formatDecimal(day.playtimeMinutes / 60),
      cellTitle: `${wd} ${num} : ${day.games} partie${day.games > 1 ? 's' : ''}, ${day.wins} V ${day.losses} D, ${lp === null ? 'LP inconnus' : `${formatSigned(lp)} LP`}`,
    }
  })
})
</script>

<template>
  <section
    aria-label="La semaine jour par jour"
    class="ledger overflow-hidden rounded-5 border border-line/70 bg-surface shadow-card"
  >
    <div class="ledger-head">
      <h2 class="type-title">La semaine jour par jour</h2>
      <span v-if="activePlayers.length > 0" class="who-played">
        <span class="stack">
          <template v-for="player in activePlayers" :key="player.id">
            <img
              v-if="player.iconUrl"
              :src="player.iconUrl"
              :title="player.title"
              alt=""
            >
          </template>
        </span>
        <span class="type-small" title="Au moins une partie classée sur 7 jours">{{ activeText }}</span>
      </span>
    </div>

    <!-- Wide table: days are columns, week total is the rightmost column -->
    <div
      v-if="days.length > 0"
      class="lw"
      :data-hover="hoveredDay !== null ? '' : undefined"
      role="table"
      aria-label="Activité classée du crew, jour par jour"
      @pointerleave="hoveredDay = null"
    >
      <div class="lw-row lw-dates" role="row">
        <span class="type-label" role="columnheader">Jour</span>
        <div
          v-for="day in days"
          :key="`date-${day.key}`"
          class="lw-day"
          :class="{ today: day.isToday, hl: hoveredDay === day.key }"
          :title="day.cellTitle"
          @pointerenter="hoveredDay = day.key"
        >
          <span>{{ day.isToday ? 'auj.' : day.wd }}</span>
          <b>{{ day.num }}</b>
        </div>
        <div class="tot" role="columnheader">
          <span class="type-label text-ink-3">7 jours</span>
        </div>
      </div>

      <div class="lw-row" role="row">
        <span class="type-label" role="rowheader">Parties</span>
        <div
          v-for="day in days"
          :key="`games-${day.key}`"
          class="lw-day"
          :class="{ today: day.isToday, hl: hoveredDay === day.key }"
          :title="day.cellTitle"
          @pointerenter="hoveredDay = day.key"
        >
          <span class="fig fig-s">{{ day.games }}</span>
        </div>
        <div class="tot">
          <span><span class="fig">{{ activity.gamesThisWeek }}</span></span>
          <span class="delta text-ink-2" :title="`${activity.gamesLastWeek} les 7 jours précédents`">
            {{ formatSigned(gamesDelta) }} vs 7 j préc.
          </span>
        </div>
      </div>

      <div class="lw-row" role="row">
        <span class="type-label" role="rowheader">Bilan</span>
        <div
          v-for="day in days"
          :key="`bilan-${day.key}`"
          class="lw-day"
          :class="{ today: day.isToday, hl: hoveredDay === day.key }"
          :title="day.cellTitle"
          @pointerenter="hoveredDay = day.key"
        >
          <span class="lw-bilan">
            <span class="split" :class="day.games === 0 ? 'empty-split' : ''" aria-hidden="true">
              <i :style="{ width: `${day.winPct}%` }" />
            </span>
            <span>{{ day.wins }}–{{ day.losses }}</span>
          </span>
        </div>
        <div class="tot">
          <span>
            <span class="fig">{{ Math.round(activity.winRateThisWeek) }}</span><span class="unit">%</span>
          </span>
          <span class="delta">
            <span class="text-ink-3">{{ activity.winsThisWeek }} V · {{ activity.lossesThisWeek }} D</span>
            <template v-if="winRateDelta">
              <span class="text-ink-3"> · </span>
              <span :class="winRateDelta.class" :title="winRateDelta.title">{{ winRateDelta.text }}</span>
            </template>
          </span>
        </div>
      </div>

      <div class="lw-row" role="row">
        <span class="type-label" role="rowheader">LP nets</span>
        <div
          v-for="day in days"
          :key="`lp-${day.key}`"
          class="lw-day"
          :class="{ today: day.isToday, hl: hoveredDay === day.key }"
          :title="day.cellTitle"
          @pointerenter="hoveredDay = day.key"
        >
          <span class="lw-lp">
            <span class="lp-bar" aria-hidden="true">
              <i
                v-if="day.lpBarKind !== null"
                :class="day.lpBarKind"
                :style="day.lpBarKind !== 'zero' ? { height: `${day.lpPct}%` } : undefined"
              />
            </span>
            <span class="v" :class="day.lpToneClass">{{ day.lp === null ? '—' : formatSigned(day.lp) }}</span>
          </span>
        </div>
        <div class="tot">
          <span :class="lpTone">
            <span class="fig">{{ formatSigned(activity.netLpChangeThisWeek) }}</span><span class="unit">LP</span>
          </span>
          <span class="delta text-ink-3">Solo/Duo + Flex</span>
        </div>
      </div>

      <div class="lw-row" role="row">
        <span class="type-label" role="rowheader">Temps</span>
        <div
          v-for="day in days"
          :key="`time-${day.key}`"
          class="lw-day lw-time"
          :class="{ today: day.isToday, hl: hoveredDay === day.key }"
          :title="day.cellTitle"
          @pointerenter="hoveredDay = day.key"
        >
          <span class="bar" aria-hidden="true">
            <i :style="{ width: `${day.timePct}%` }" />
          </span>
          <span>{{ day.hours }} h</span>
        </div>
        <div class="tot">
          <span>
            <span class="fig">{{ totalHours }}</span><span class="unit">h</span>
          </span>
          <span class="delta text-ink-3">{{ averageDuration }}</span>
        </div>
      </div>
    </div>

    <!-- Narrow view (below 760px container width, or always when days are absent) -->
    <div :class="days.length > 0 ? 'ln' : ''">
      <div class="ln-tot" :class="days.length === 0 ? '!border-b-0' : ''">
        <div>
          <span class="type-label text-ink-3">Parties</span>
          <span class="fig">{{ activity.gamesThisWeek }}</span>
          <span class="delta text-ink-2">{{ formatSigned(gamesDelta) }} vs 7 j préc.</span>
        </div>
        <div>
          <span class="type-label text-ink-3">Victoires</span>
          <span><span class="fig">{{ Math.round(activity.winRateThisWeek) }}</span><span class="unit"> %</span></span>
          <span v-if="winRateDelta" class="delta" :class="winRateDelta.class">{{ winRateDelta.text }}</span>
          <span v-else class="delta text-ink-3">{{ activity.winsThisWeek }} V · {{ activity.lossesThisWeek }} D</span>
        </div>
        <div>
          <span class="type-label text-ink-3">LP nets</span>
          <span class="fig" :class="lpTone">{{ formatSigned(activity.netLpChangeThisWeek) }}</span>
          <span class="delta text-ink-3">Solo/Duo + Flex</span>
        </div>
        <div>
          <span class="type-label text-ink-3">Temps de jeu</span>
          <span><span class="fig">{{ totalHours }}</span><span class="unit"> h</span></span>
          <span class="delta text-ink-3">{{ averageDuration }}</span>
        </div>
      </div>

      <div v-if="days.length > 0" class="ln-days">
        <div
          v-for="day in days"
          :key="`narrow-${day.key}`"
          class="ln-day"
          :class="{ today: day.isToday }"
        >
          <span class="d">
            <b>{{ day.label }}</b>
            <span>{{ day.wins }} V · {{ day.losses }} D</span>
          </span>
          <span class="n">{{ day.games }}</span>
          <span class="ln-lp" aria-hidden="true">
            <i
              v-if="day.lp !== null && day.lp !== 0"
              :class="day.lp > 0 ? 'up' : 'down'"
              :style="{ width: `${day.lpPct}%` }"
            />
          </span>
          <span class="v" :class="day.lpToneClass">{{ day.lp === null ? '—' : `${formatSigned(day.lp)} LP` }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.ledger {
  container: ledger / inline-size;
}

.ledger-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
}

.ledger-head .who-played {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--ink-2);
}

.stack {
  display: flex;
  align-items: center;
}

.stack img {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 0 2px var(--surface);
}

.stack img + img {
  margin-left: -6px;
}

/* Wide: days are columns, the week total is the last column */
.lw {
  display: none;
}

.lw-row {
  display: grid;
  grid-template-columns: 104px repeat(7, minmax(0, 1fr)) 168px;
  border-bottom: 1px solid var(--line);
}

.lw-row:last-child {
  border-bottom: 0;
}

.lw-row > * {
  padding: 10px 8px;
  min-width: 0;
}

.lw-row > :first-child {
  padding-left: 16px;
  display: flex;
  align-items: center;
  color: var(--ink-3);
}

.lw-row > .tot {
  padding: 10px 16px;
  border-left: 1px solid var(--line);
  background: var(--sunken);
  display: grid;
  gap: 3px;
  align-content: center;
}

.lw-day {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 6px;
  text-align: center;
  transition: background-color 120ms var(--ease-out);
}

.lw[data-hover] .lw-day.hl {
  background: color-mix(in oklch, var(--sunken) 80%, var(--surface));
}

.lw-dates .lw-day {
  gap: 1px;
  padding-block: 10px 8px;
}

.lw-dates .lw-day b {
  font-stretch: 72%;
  font-weight: 680;
  font-size: 1.25rem;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.lw-dates .lw-day span {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--ink-3);
}

.lw-dates .lw-day.today {
  box-shadow: inset 0 2px 0 var(--ink);
}

.lw-dates .lw-day.today span {
  color: var(--ink);
  font-weight: 600;
}

.lw-dates .tot {
  background: var(--sunken);
}

.lw .fig-s {
  font-size: 1.125rem;
}

.lw-bilan {
  width: 100%;
  max-width: 72px;
  display: grid;
  gap: 5px;
  justify-items: center;
}

.split {
  display: flex;
  width: 100%;
  height: 6px;
  border-radius: 2px;
  overflow: hidden;
  background: var(--loss);
}

.split.empty-split {
  background: var(--neutral-soft);
}

.split i {
  display: block;
  height: 100%;
  background: var(--win);
}

.lw-bilan span:not(.split) {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-2);
}

.lw-lp {
  width: 100%;
  display: grid;
  gap: 4px;
  justify-items: center;
}

.lp-bar {
  position: relative;
  width: 100%;
  max-width: 40px;
  height: 64px;
}

.lp-bar::before {
  content: "";
  position: absolute;
  left: -10px;
  right: -10px;
  top: 50%;
  height: 1px;
  background: var(--line-strong);
}

.lp-bar i {
  position: absolute;
  left: 0;
  right: 0;
  border-radius: 2px;
}

.lp-bar i.up {
  background: var(--win);
  bottom: 50%;
}

.lp-bar i.down {
  background: var(--loss);
  top: 50%;
}

.lp-bar i.zero {
  top: calc(50% - 1px);
  height: 2px;
  background: var(--ink-3);
}

.lw-lp .v {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
}

.tot .fig {
  font-size: 1.75rem;
}

.tot .unit,
.ln-tot .unit {
  font-weight: 620;
  color: var(--ink-2);
  font-size: 0.875rem;
  margin-left: 2px;
}

.tot .delta,
.ln-tot .delta {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
}

.lw-time .bar {
  width: 100%;
  max-width: 40px;
  height: 6px;
  border-radius: 2px;
  background: var(--neutral-soft);
  overflow: hidden;
}

.lw-time .bar i {
  display: block;
  height: 100%;
  background: var(--canopy);
  opacity: 0.75;
}

.lw-time span:not(.bar) {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-2);
}

/* Narrow: the week total first, then one row per day */
.ln-tot {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-bottom: 1px solid var(--line);
}

.ln-tot > div {
  display: grid;
  gap: 4px;
  padding: 12px 16px;
  min-width: 0;
}

.ln-tot > div:nth-child(even) {
  border-left: 1px solid var(--line);
}

.ln-tot > div:nth-child(n + 3) {
  border-top: 1px solid var(--line);
}

.ln-tot .fig {
  font-size: 2.25rem;
}

.ln-days {
  display: grid;
}

.ln-day {
  display: grid;
  grid-template-columns: 78px 28px minmax(0, 1fr) 64px;
  gap: 10px;
  align-items: center;
  padding: 8px 16px;
  border-top: 1px solid var(--line);
}

.ln-day:first-child {
  border-top: 0;
}

.ln-day .d {
  display: grid;
  line-height: 1.15;
}

.ln-day .d b {
  font-weight: 640;
  font-size: 0.8125rem;
}

.ln-day .d span {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--ink-3);
  white-space: nowrap;
}

.ln-day.today .d b::after {
  content: " · auj.";
  color: var(--ink-3);
  font-weight: 500;
}

.ln-day .n {
  font-stretch: 72%;
  font-weight: 680;
  font-size: 1.125rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.ln-lp {
  position: relative;
  height: 10px;
}

.ln-lp::before {
  content: "";
  position: absolute;
  top: -3px;
  bottom: -3px;
  left: 50%;
  width: 1px;
  background: var(--line-strong);
}

.ln-lp i {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 2px;
}

.ln-lp i.up {
  left: 50%;
  background: var(--win);
}

.ln-lp i.down {
  right: 50%;
  background: var(--loss);
}

.ln-day .v {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  text-align: right;
}

@container ledger (min-width: 760px) {
  .lw {
    display: block;
  }

  .ln {
    display: none;
  }
}
</style>
