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

/**
 * The tint is a wash of the result laid over the scrim (the photo's `::after`), so the art reads
 * won or lost before the title does; a remake or a pending game gets none.
 */
const STATE_CLASSES: Record<HeroState, { title: string, ring: string, tint: string }> = {
  win: {
    title: 'text-on-night-win',
    ring: 'border-on-night-win',
    tint: 'after:bg-[linear-gradient(180deg,color-mix(in_oklch,var(--win)_18%,transparent),transparent_60%)]',
  },
  loss: {
    title: 'text-on-night-loss',
    ring: 'border-on-night-loss',
    tint: 'after:bg-[linear-gradient(180deg,color-mix(in_oklch,var(--loss)_18%,transparent),transparent_60%)]',
  },
  remake: { title: 'text-on-night', ring: 'border-on-night-2', tint: '' },
  pending: { title: 'text-on-night', ring: 'border-on-night-2', tint: '' },
}

const stateLabel = computed(() => STATE_LABELS[state.value])
const stateClasses = computed(() => STATE_CLASSES[state.value])

// Read as a title in every state, but "Partie non synchronisée" is three times longer than "Victoire".
const titleSizeClass = computed(() => (state.value === 'pending' ? 'type-d2 md:text-[2.25rem]' : 'type-d1'))

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

// The chip sits on the night band, where the soft washes of the light surfaces vanish: the tone
// moves to the figure instead.
const RATING_PHOTO_CLASSES: Record<RatingTone, string> = {
  gold: 'text-on-night-gold',
  green: 'text-on-night-win',
  blue: 'text-on-night-blue',
  grey: 'text-on-night',
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

/** The queue is a word; duration, date and patch are technical figures and read in mono. */
const metaChips = computed(() => {
  const version = props.game.gameVersion?.split('.') ?? []
  return [
    { label: props.queueLabel, mono: false },
    { label: durationSeconds.value > 0 ? formatDuration(durationSeconds.value) : '', mono: true },
    { label: formatShortDateTime(props.game.gameStart), mono: true },
    { label: version.length >= 2 ? `Patch ${version[0]}.${version[1]}` : '', mono: true },
  ].filter((chip) => chip.label !== '')
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
  gain: 'text-on-night-win',
  loss: 'text-on-night-loss',
  neutral: 'text-on-night',
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
  <section aria-label="Résumé de la partie" class="relative overflow-hidden rounded-5 bg-night px-5 pb-[22px] pt-[118px] text-on-night shadow-card md:px-8 md:py-[30px]">
    <!--
      One splash per page. Under md it is a band over the top of the card that rises into the night
      (scrim-rise), so the identity wrapping across the full width always sits on the opaque part;
      from md the art fills the card and the scrim darkens its left side, where the identity is.
      The scrim and the result tint are the photo's own pseudo-elements, which is what the
      contrast audit reads.
    -->
    <div
      aria-hidden="true"
      data-photo
      class="absolute inset-x-0 top-0 h-[150px] bg-night-2 bg-cover bg-no-repeat bg-[position:center_22%] before:absolute before:inset-0 before:bg-scrim-rise before:content-[''] after:absolute after:inset-0 after:content-[''] md:inset-0 md:h-auto md:bg-[position:right_22%] md:before:bg-scrim-side"
      :class="stateClasses.tint"
      :style="splashStyle"
    />

    <div class="relative flex flex-wrap items-end justify-between gap-6">
      <div class="flex min-w-0 flex-wrap items-center gap-x-[22px] gap-y-4">
        <span class="relative size-[84px] shrink-0 md:size-28">
          <span
            class="absolute inset-0 rounded-4 border-[3px] bg-night-2 bg-[length:112%] bg-center"
            :class="stateClasses.ring"
            :style="avatarStyle"
          />
          <span
            v-if="heroPlayer?.champLevel"
            title="Niveau du champion"
            class="type-mono absolute -bottom-2.5 left-1/2 inline-flex h-5 -translate-x-1/2 items-center whitespace-nowrap rounded-full bg-on-night px-2 text-[11px] font-semibold text-night"
          >{{ heroPlayer.champLevel }}</span>
        </span>

        <div class="flex min-w-0 flex-col gap-2.5">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 class="m-0" :class="[titleSizeClass, stateClasses.title]">{{ stateLabel }}</h1>
            <span
              v-if="showRating"
              title="Note sur 10 : KDA, KP, Dégâts, Or, Survie"
              class="inline-flex h-7 items-baseline gap-1 whitespace-nowrap rounded-full border border-on-night-line bg-night-2 px-3 pt-[5px] text-[13px] font-semibold text-on-night"
            >Note <span class="fig text-[17px]" :class="ratingClass">{{ ratingLabel }}</span></span>
            <span
              v-if="accoladeLabel"
              class="inline-flex h-6 items-center whitespace-nowrap rounded-1 px-2 text-[12px] font-[650]"
              :class="isMvp ? 'bg-on-night text-night' : 'bg-violet-soft text-violet-ink'"
            >{{ accoladeLabel }}</span>
          </div>
          <p v-if="heroLine" class="type-body m-0 font-semibold text-on-night">{{ heroLine }}</p>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="chip in metaChips"
              :key="chip.label"
              class="inline-flex h-6 items-center rounded-full border border-on-night-line bg-night/80 px-2.5 text-on-night"
              :class="chip.mono ? 'type-mono' : 'text-[12px] font-semibold'"
            >{{ chip.label }}</span>
          </div>
        </div>
      </div>

      <!-- Below the rail width this column wraps under the identity, where it reads left-aligned. -->
      <div class="flex flex-col items-start gap-2 rail:items-end">
        <span
          v-if="rankChange"
          :title="lpTitle"
          class="inline-flex items-baseline gap-1.5 rounded-full border border-on-night-line bg-night/80 px-4 py-2"
          :class="lpClass"
        >
          <span class="fig text-[34px]">{{ formatSignedLp(rankChange.leaguePointsChange) }}</span>
          <span class="text-[13px] font-semibold">LP</span>
        </span>
        <span
          v-if="transitionLabel"
          class="inline-flex h-7 items-center gap-1.5 rounded-full border border-on-night-line bg-night/80 pl-2 pr-3 text-xs font-semibold text-on-night"
        >
          <Icon
            :name="transition === 'promotion' ? 'lucide:chevrons-up' : 'lucide:chevrons-down'"
            class="size-3.5"
            :class="transition === 'promotion' ? 'text-on-night-win' : 'text-on-night-loss'"
          />
          <UiAppImage :src="transitionEmblem" alt="" class="size-4" />
          {{ transitionLabel }}
        </span>
        <button
          type="button"
          :disabled="isSyncing"
          :aria-busy="isSyncing"
          title="Recharger la partie depuis l'API GameOn"
          class="inline-flex h-8 cursor-pointer items-center gap-[7px] rounded-2 border border-on-night-line bg-night/80 px-3 text-[13px] font-semibold text-on-night transition-colors duration-[120ms] ease-out hover:bg-night-2 disabled:cursor-wait"
          @click="emit('syncRequested')"
        >
          <Icon name="lucide:refresh-cw" class="size-[13px] text-on-night-2" :class="{ 'animate-spin': isSyncing }" />
          {{ isSyncing ? 'Synchronisation…' : 'Synchroniser' }}
        </button>
        <span class="type-mono rounded-1 bg-night/80 px-1.5 py-0.5 text-[11px] text-on-night-2">{{ game.matchId }}</span>
      </div>
    </div>
  </section>
</template>
