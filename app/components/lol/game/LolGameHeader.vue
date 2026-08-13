<template>
  <div class="block">
    <div class="relative">
      <div
        class="pointer-events-none absolute -inset-10 -z-10 rounded-[2.5rem] blur-3xl"
        :class="glowClass"
      ></div>

      <div class="relative p-5 rounded-2xl bg-surface-base border shadow-sm overflow-hidden" :class="frameClass">
        <template v-if="splashUrl">
          <img
            :src="splashUrl"
            alt=""
            aria-hidden="true"
            class="light:opacity-30 pointer-events-none absolute inset-0 h-full w-full object-cover object-[60%_25%] opacity-80"
          />
          <div
            class="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,var(--color-bg-base)_0%,var(--color-bg-base)_20%,color-mix(in_srgb,var(--color-bg-base)_60%,transparent)_46%,color-mix(in_srgb,var(--color-bg-base)_32%,transparent)_100%)]"
          ></div>
        </template>
        <div
          class="pointer-events-none absolute inset-0"
          :class="tintClass"
        ></div>

        <div class="relative flex flex-wrap items-center gap-x-5 gap-y-4">
          <div class="relative shrink-0">
            <img
              :src="championIconUrlStr"
              :alt="heroPlayer?.championName"
              class="h-[72px] w-[72px] rounded-2xl border-2 border-white/25 object-cover shadow-lg"
            />
            <span
              class="bg-bg-base text-text-main border-border-base absolute -bottom-2 left-1/2 min-w-[26px] -translate-x-1/2 rounded-full border px-1.5 py-0.5 text-center text-[11px] font-semibold"
            >
              {{ heroPlayer?.champLevel || "??" }}
            </span>
          </div>

          <div class="min-w-[15rem] flex-1">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p
                class="font-sans text-2xl font-bold"
                :class="statusToneClass"
              >
                {{ statusLabel }}
              </p>

              <span
                v-if="showRating"
                class="whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-semibold"
                :class="ratingTone"
                title="Note sur 10 : KDA, KP, Dégâts, Or, Survie"
              >
                Note {{ ratingLabel }}
              </span>

              <span
                v-if="accoladeLabel"
                class="border-brand-gold/45 bg-brand-gold/15 text-brand-gold inline-flex items-center whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold"
              >
                {{ accoladeLabel }}
              </span>
            </div>

            <p v-if="heroLine" class="text-text-main mt-2 text-sm">{{ heroLine }}</p>
            <p class="text-text-sec mt-0.5 text-[13px]">{{ metaLine }}</p>
          </div>

          <button
            type="button"
            class="text-text-main border-border-base flex shrink-0 items-center gap-2 rounded-full border bg-white/5 px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isSyncing"
            @click="onSync"
          >
            <Icon name="lucide:refresh-cw" :class="{ 'animate-spin': isSyncing }" class="w-4 h-4" />
            Synchroniser
          </button>
        </div>
      </div>
    </div>

    <div v-if="hasObjectives" class="rounded-2xl bg-surface-base border border-border-base shadow-sm divide-border-base mt-3 grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
      <div v-for="row in objectiveRows" :key="row.teamId" class="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 p-4">
        <span class="h-2.5 w-2.5 shrink-0 rounded-full" :class="row.dotClass"></span>
        <span class="font-sans text-text-main text-xl font-bold">
          {{ row.objectives.kills }}
        </span>

        <span
          v-for="badge in row.badges"
          :key="badge.label"
          :title="badge.label"
          class="border-border-base text-text-sec inline-flex items-center gap-1 rounded-lg border bg-white/5 px-2 py-1 text-xs font-semibold"
        >
          <img :src="badge.iconUrl" class="h-4 w-4 object-contain" />
          {{ badge.value }}
        </span>
      </div>
    </div>
  </div>
</template>

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
  ratingFor,
  ratingToneClass,
} from '~/utils/lol-match'
import {
  ATAKHAN_ICON_URL,
  BARON_ICON_URL,
  DRAGON_ICON_URL,
  GRUB_ICON_URL,
  HERALD_ICON_URL,
  INHIBITOR_ICON_URL,
  type TeamObjectives,
  teamObjectivesFor,
  TOWER_ICON_URL,
} from '~/utils/lol-timeline-event'

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

const onSync = () => {
  emit('syncRequested')
}

const durationSeconds = computed(() => durationSecondsFor(props.game))

const rating = computed(() => {
  if (!props.heroPlayer) return 0
  return ratingFor(
    props.heroPlayer,
    props.heroPlayer.teamId === 100 ? props.team1 : props.team2,
    props.timeline,
    durationSeconds.value
  )
})

const objectiveRows = computed(() => {
  const players = [...props.team1, ...props.team2]
  return [
    { teamId: 100, dotClass: 'bg-brand-green' },
    { teamId: 200, dotClass: 'bg-brand-red' },
  ].map(({ teamId, dotClass }) => {
    const objectives = teamObjectivesFor(
      props.game.leagueOfLegendsGameTeams || [],
      props.timeline,
      players,
      teamId
    )

    const badges = [
      { iconUrl: TOWER_ICON_URL, label: 'Tourelles', value: objectives.towers },
      { iconUrl: INHIBITOR_ICON_URL, label: 'Inhibiteurs', value: objectives.inhibitors },
      { iconUrl: DRAGON_ICON_URL, label: 'Dragons', value: objectives.dragons },
      { iconUrl: HERALD_ICON_URL, label: 'Hérauts de la Faille', value: objectives.heralds },
      { iconUrl: GRUB_ICON_URL, label: 'Voracraves', value: objectives.grubs },
      { iconUrl: BARON_ICON_URL, label: 'Barons Nashor', value: objectives.barons },
      { iconUrl: ATAKHAN_ICON_URL, label: 'Atakhan', value: objectives.atakhans },
    ].filter((badge) => badge.value > 0)

    return { teamId, dotClass, objectives, badges }
  })
})

const hasObjectives = computed(() => {
  return objectiveRows.value.some((row) => row.objectives.kills > 0 || row.badges.length > 0)
})

const isSynced = computed(() => {
  return props.game.endOfGameResult != null && props.game.endOfGameResult !== ''
})

const heroWon = computed(() => {
  if (props.game.isRemake) return undefined
  return props.heroPlayer?.win
})

const statusLabel = computed(() => {
  if (props.game.isRemake) return 'Remake'
  if (!isSynced.value) return 'Partie non synchronisée'
  return heroWon.value ? 'Victoire' : 'Défaite'
})

const statusToneClass = computed(() => {
  if (props.game.isRemake || !isSynced.value) return 'text-text-sec'
  return heroWon.value ? 'text-brand-green' : 'text-brand-red'
})

const frameClass = computed(() => {
  if (props.game.isRemake || !isSynced.value) return 'border-border-base'
  return heroWon.value ? 'border-brand-green/35' : 'border-brand-red/35'
})

const tintClass = computed(() => {
  if (props.game.isRemake || !isSynced.value) {
    return 'bg-[linear-gradient(180deg,rgba(107,138,251,0.10),transparent)]'
  }
  return heroWon.value
    ? 'bg-[linear-gradient(180deg,rgba(45,224,165,0.16),transparent)]'
    : 'bg-[linear-gradient(180deg,rgba(255,92,116,0.16),transparent)]'
})

const glowClass = computed(() => {
  if (props.game.isRemake || !isSynced.value) return 'bg-brand-gold/10' // Neutral
  return heroWon.value ? 'bg-brand-green/20' : 'bg-brand-red/20'
})

const showRating = computed(() => {
  return props.heroPlayer != null && isSynced.value && !props.game.isRemake
})

const ratingLabel = computed(() => decimalLabel(rating.value, 1))

const ratingTone = computed(() => {
  // Convert old mpGreenInk etc classes to brand-green
  const oldClass = ratingToneClass(rating.value)
  if (oldClass.includes('Yellow')) return 'text-brand-gold border-brand-gold/45 bg-brand-gold/15'
  if (oldClass.includes('Green')) return 'text-brand-green border-brand-green/45 bg-brand-green/15'
  if (oldClass.includes('Blue')) return 'text-blue-400 border-blue-400/45 bg-blue-400/15'
  return 'text-text-sec border-border-base bg-white/5'
})

const accoladeLabel = computed(() => {
  if (!showRating.value) return ''
  if (props.isMvp) return 'MVP de la partie'
  if (props.isAce) return 'ACE de la partie'
  return ''
})

const heroLine = computed(() => {
  if (props.heroPlayer == null) return ''
  const { riotIdGameName, championName, kills, deaths, assists } = props.heroPlayer
  const name = riotIdGameName || ''
  const identity = championName ? `${name} sur ${championName}`.trim() : name

  if (!isSynced.value) return identity

  return [
    identity,
    `${kills} / ${deaths} / ${assists}`,
    `${kdaLabel(props.heroPlayer)} KDA`,
  ].filter((part) => part !== '').join(' · ')
})

const patchTitle = computed(() => {
  if (!props.game.gameVersion) return ''
  const [major, minor] = props.game.gameVersion.split('.')
  return `Patch ${major}.${minor}`
})

const metaLine = computed(() => {
  return [
    props.queueLabel,
    durationSeconds.value > 0 ? formatDuration(durationSeconds.value) : '',
    formatShortDateTime(props.game.gameStart),
    patchTitle.value,
  ].filter((part) => part !== '').join(' · ')
})

const championIconUrlStr = computed(() => {
  return championIconUrl(props.heroPlayer?.championName, props.patch)
})

const splashUrl = computed(() => {
  if (!props.heroPlayer?.championName) return ''
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${props.heroPlayer.championName}_0.jpg`
})
</script>
