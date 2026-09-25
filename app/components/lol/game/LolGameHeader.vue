<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameDto, LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import {
  championIconUrl,
  decimalLabel,
  durationSecondsFor,
  formatDuration,
  formatShortDateTime,
  kdaLabel,
  playerRiotName,
  ratingFor,
  ratingTone,
} from '~/utils/lol-match'
import type { RatingTone } from '~/utils/lol-match'
import { championDisplayName, championSplashUrl } from '~/utils/lol-champion'
import { formatSignedLp, lpDeltaTone, rankAfter, rankChangeSummary, rankTransition } from '~/utils/lol-rank-change'
import { tierEmblemUrl, tierLabel } from '~/utils/lol-tier'

const props = defineProps<{
  game: LoLGameDto
  heroPlayer?: LoLGameParticipantDto
  team1: LoLGameParticipantDto[]
  team2: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  patch: string
  queueLabel: string
  isMvp: boolean
  isAce: boolean
  isSyncing: boolean
}>()

const emit = defineEmits<{
  (e: 'syncRequested'): void
}>()

const durationSeconds = computed(() => durationSecondsFor(props.game))

/** A game the API has not finished importing carries no result yet. */
const isSynced = computed(() => props.game.endOfGameResult != null && props.game.endOfGameResult !== '')

type HeroState = 'win' | 'loss' | 'remake' | 'pending'

const state = computed<HeroState>(() => {
  if (props.game.isRemake) return 'remake'
  if (!isSynced.value) return 'pending'
  return props.heroPlayer?.win ? 'win' : 'loss'
})

const STATE_LABELS: Record<HeroState, string> = {
  win: 'Victoire',
  loss: 'Défaite',
  remake: 'Remake',
  pending: 'Partie non synchronisée',
}

const STATE_CLASSES: Record<HeroState, { title: string, ring: string, tint: string }> = {
  win: { title: 'text-on-photo-mint', ring: 'border-on-photo-mint', tint: 'from-signal/16' },
  loss: { title: 'text-on-photo-red', ring: 'border-on-photo-red', tint: 'from-loss/18' },
  remake: { title: 'text-white/80', ring: 'border-white/70', tint: 'from-white/6' },
  pending: { title: 'text-white/80', ring: 'border-white/70', tint: 'from-white/6' },
}

const stateLabel = computed(() => STATE_LABELS[state.value])
const stateClasses = computed(() => STATE_CLASSES[state.value])

// Read as a title in every state, but "Partie non synchronisée" is three times longer than "Victoire".
const titleSizeClass = computed(() => (state.value === 'pending'
  ? 'text-4xl md:text-5xl'
  : 'text-5xl md:text-[64px] rail:text-[76px]'))

const rating = computed(() => {
  if (!props.heroPlayer) return 0
  return ratingFor(
    props.heroPlayer,
    props.heroPlayer.teamId === 100 ? props.team1 : props.team2,
    props.timeline,
    durationSeconds.value,
  )
})

const showRating = computed(() => props.heroPlayer != null && isSynced.value && !props.game.isRemake)
const ratingLabel = computed(() => decimalLabel(rating.value, 1))

// Solid fills: the chip sits on the dark scrim, where the soft washes of the light surfaces vanish.
const RATING_PHOTO_CLASSES: Record<RatingTone, string> = {
  gold: 'bg-on-photo-gold',
  green: 'bg-on-photo-mint',
  blue: 'bg-on-photo-blue',
  grey: 'bg-white/80',
}
const ratingClass = computed(() => RATING_PHOTO_CLASSES[ratingTone(rating.value)])

const accoladeLabel = computed(() => {
  if (!showRating.value) return ''
  if (props.isMvp) return 'MVP de la partie'
  if (props.isAce) return 'ACE de la partie'
  return ''
})

const heroName = computed(() => (props.heroPlayer ? playerRiotName(props.heroPlayer) : ''))

const heroLine = computed(() => {
  const hero = props.heroPlayer
  if (hero == null) return ''
  const identity = hero.championName ? `${heroName.value} sur ${championDisplayName(hero.championName)}` : heroName.value
  if (!isSynced.value) return identity
  return [identity, `${hero.kills} / ${hero.deaths} / ${hero.assists}`, `${kdaLabel(hero)} KDA`].join(' · ')
})

const metaChips = computed(() => {
  const version = props.game.gameVersion?.split('.') ?? []
  return [
    props.queueLabel,
    durationSeconds.value > 0 ? formatDuration(durationSeconds.value) : '',
    formatShortDateTime(props.game.gameStart),
    version.length >= 2 ? `Patch ${version[0]}.${version[1]}` : '',
  ].filter((chip) => chip !== '')
})

const avatarStyle = computed(() => (props.heroPlayer?.championName
  ? { backgroundImage: `url('${championIconUrl(props.heroPlayer.championName, props.patch)}')` }
  : {}))

const splashStyle = computed(() => (props.heroPlayer?.championName
  ? { backgroundImage: `url('${championSplashUrl(props.heroPlayer.championName)}')` }
  : {}))

/**
 * The LP the hero won or lost on this game. `null` is unknown — several games between two rank
 * refreshes — and prints nothing: a "0 LP" would state a result the API never measured.
 */
const rankChange = computed(() => props.heroPlayer?.rankChange ?? null)

const LP_CLASSES = {
  gain: 'bg-on-photo-mint text-ink',
  loss: 'bg-on-photo-red text-ink',
  neutral: 'bg-white/85 text-ink',
} as const

const lpClass = computed(() => (rankChange.value ? LP_CLASSES[lpDeltaTone(rankChange.value.leaguePointsChange)] : ''))
const lpTitle = computed(() => (rankChange.value
  ? `Évolution de LP de ${heroName.value} · ${rankChangeSummary(rankChange.value)}`
  : ''))

const transition = computed(() => (rankChange.value ? rankTransition(rankChange.value) : null))
const transitionLabel = computed(() => {
  if (!rankChange.value || !transition.value) return ''
  const prefix = transition.value === 'promotion' ? 'Promotion en' : 'Rétrogradation en'
  return `${prefix} ${tierLabel(rankAfter(rankChange.value))}`
})
const transitionEmblem = computed(() => (rankChange.value ? tierEmblemUrl(rankAfter(rankChange.value)) : ''))
</script>

<template>
  <section aria-label="Résumé de la partie" class="relative animate-rise overflow-hidden rounded-[30px] bg-ink px-5 py-[22px] text-white shadow-hero md:px-8 md:py-[30px]">
    <div aria-hidden="true" class="absolute inset-0 bg-cover bg-no-repeat bg-[position:right_22%]" :style="splashStyle" />
    <div aria-hidden="true" class="absolute inset-0 bg-scrim-hero" />
    <div aria-hidden="true" class="absolute inset-0 bg-linear-to-b to-transparent to-60%" :class="stateClasses.tint" />

    <div class="relative flex flex-wrap items-end justify-between gap-6">
      <div class="flex min-w-0 flex-wrap items-center gap-[22px]">
        <span class="relative size-[84px] shrink-0 md:size-28">
          <span
            class="absolute inset-0 rounded-[28px] border-[3px] bg-ink bg-[length:112%] bg-center shadow-[0_14px_30px_-10px_rgba(0,0,0,0.6)]"
            :class="stateClasses.ring"
            :style="avatarStyle"
          />
          <span
            v-if="heroPlayer?.champLevel"
            title="Niveau du champion"
            class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-[3px] font-mono text-[11.5px] font-semibold text-ink"
          >{{ heroPlayer.champLevel }}</span>
        </span>

        <div class="flex min-w-0 flex-col gap-2.5">
          <div class="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            <h1 class="m-0 font-bold leading-[0.95] tracking-[-0.05em]" :class="[titleSizeClass, stateClasses.title]">{{ stateLabel }}</h1>
            <span
              v-if="showRating"
              title="Note sur 10 : KDA, KP, Dégâts, Or, Survie"
              class="whitespace-nowrap rounded-full px-3 py-[5px] text-sm font-bold text-ink"
              :class="ratingClass"
            >Note {{ ratingLabel }}</span>
            <span
              v-if="accoladeLabel"
              class="whitespace-nowrap rounded-full bg-brand-gold-bright px-3 py-[5px] text-[13px] font-bold text-ink"
            >{{ accoladeLabel }}</span>
          </div>
          <p v-if="heroLine" class="m-0 text-base font-semibold">{{ heroLine }}</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="chip in metaChips"
              :key="chip"
              class="rounded-full border border-white/20 bg-white/10 px-3 py-[5px] text-[12.5px] font-bold"
            >{{ chip }}</span>
          </div>
        </div>
      </div>

      <!-- Below the rail width this column wraps under the identity, where it reads left-aligned. -->
      <div class="flex flex-col items-start gap-2.5 rail:items-end">
        <span
          v-if="rankChange"
          :title="lpTitle"
          class="inline-flex items-baseline gap-1.5 rounded-full px-5 py-2.5"
          :class="lpClass"
        >
          <span class="text-[30px] font-bold leading-none tracking-[-0.04em]">{{ formatSignedLp(rankChange.leaguePointsChange) }}</span>
          <span class="text-sm font-bold">LP</span>
        </span>
        <span
          v-if="transitionLabel"
          class="inline-flex items-center gap-1.5 rounded-full border border-white/22 bg-white/10 py-1 pl-2 pr-3 text-xs font-bold"
        >
          <Icon
            :name="transition === 'promotion' ? 'lucide:chevrons-up' : 'lucide:chevrons-down'"
            class="size-3.5"
            :class="transition === 'promotion' ? 'text-on-photo-mint' : 'text-on-photo-red'"
          />
          <UiAppImage :src="transitionEmblem" alt="" class="size-4" />
          {{ transitionLabel }}
        </span>
        <button
          type="button"
          :disabled="isSyncing"
          :aria-busy="isSyncing"
          title="Recharger la partie depuis l'API GameOn"
          class="inline-flex h-8 cursor-pointer items-center gap-[7px] rounded-full border border-white/22 bg-white/10 px-[13px] text-[12.5px] font-bold transition-colors duration-200 hover:bg-white/18 disabled:cursor-wait"
          @click="emit('syncRequested')"
        >
          <Icon name="lucide:refresh-cw" class="size-[13px] text-on-photo-mint" :class="{ 'animate-spin': isSyncing }" />
          {{ isSyncing ? 'Synchronisation…' : 'Synchroniser' }}
        </button>
        <span class="font-mono text-[11.5px] font-medium text-white/60">{{ game.matchId }}</span>
      </div>
    </div>
  </section>
</template>
