<script setup lang="ts">
import { ref, computed } from 'vue'
import { useLolStore } from '~/stores/lol'
import { useEntered } from '~/composables/useEntered'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame } from '~/lib/types/timeline'
import {
  championIconUrl as getChampionIconUrl,
  creepScoreFor,
  damageSplitFor,
  damageToChampionsFor,
  decimalLabel,
  formatCompact,
  formatFull,
  goldEarnedFor,
  itemIconUrl as getItemIconUrl,
  itemSlots as getItemSlots,
  kda,
  kdaColorClass,
  kdaLabel,
  killParticipationFor,
  playerDisplayName,
  ratingFor,
  ratingToneClass,
} from '~/utils/lol-match'
import { roleIconUrl as getRoleIconUrl, roleLabel as getRoleLabel } from '~/utils/lol-role'
import { championDisplayName } from '~/utils/lol-champion'
import { isSmurf as isSmurfAccount } from '~/utils/lol-smurf'
import LolRankChangeBadge from '~/components/lol/LolRankChangeBadge.vue'

const props = defineProps<{
  player: LoLGameParticipantDto
  team: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  isSelected: boolean
  isMvp: boolean
  isAce: boolean
  /** The signed-in viewer's own row. */
  isMe: boolean
  patch: string
  durationSeconds: number
}>()

const emit = defineEmits<{
  (e: 'playerSelected', player: LoLGameParticipantDto): void
}>()

interface StatCell {
  label: string
  value: string
}

const lolStore = useLolStore()
const entered = useEntered()

const showAdvancedStats = ref(false)
const showMoreChallenges = ref(false)

const selectPlayer = () => emit('playerSelected', props.player)

// --- Identity ---
const isLinked = computed(() => props.player.player != null)
const displayName = computed(() => playerDisplayName(props.player))

/** The GameOn nickname when it differs from the Riot name: it is who the crew knows. */
const crewLabel = computed(() => (displayName.value.toLowerCase() !== props.player.riotIdGameName.toLowerCase() ? displayName.value : 'Crew'))

/**
 * The participant payload does not always carry `primaryPlayerId`; the crew list does, so it fills
 * the gap before the shared predicate decides.
 */
const primaryPlayerId = computed(() => {
  const linked = props.player.player
  if (!linked) return null
  return linked.primaryPlayerId ?? lolStore.players.find(p => p.id === linked.id)?.primaryPlayerId ?? null
})

const isSmurf = computed(() => {
  const linked = props.player.player
  return linked != null && isSmurfAccount({ id: linked.id, primaryPlayerId: primaryPlayerId.value })
})

const primaryPlayerName = computed(() => {
  if (!isSmurf.value) return null
  const primary = lolStore.players.find(p => p.id === primaryPlayerId.value)
  return primary ? (primary.riotGamesNickname || primary.nickname) : null
})

const externalSlug = computed(() => `${encodeURIComponent(props.player.riotIdGameName)}-${encodeURIComponent(props.player.riotIdTagLine)}`)

const roleLabel = computed(() => getRoleLabel(props.player.teamPosition))
const roleIconUrl = computed(() => getRoleIconUrl(props.player.teamPosition))
const levelLabel = computed(() => (props.player.champLevel ? String(props.player.champLevel) : '??'))

const championStyle = computed(() => ({ backgroundImage: `url('${getChampionIconUrl(props.player.championName, props.patch)}')` }))

const killParticipation = computed(() => killParticipationFor(props.player, props.team))

const subtitle = computed(() => [
  props.player.championName ? championDisplayName(props.player.championName) : '',
  roleLabel.value,
  `KP ${killParticipation.value} %`,
].filter(part => part !== '').join(' · '))

const rowClass = computed(() => {
  if (props.isSelected) return 'bg-picked'
  if (props.isMe) return 'bg-gold-soft'
  return 'bg-surface hover:bg-sunken'
})

// --- Figures ---
const rating = computed(() => ratingFor(props.player, props.team, props.timeline, props.durationSeconds))
const ratingLabel = computed(() => decimalLabel(rating.value, 1))
const ratingClass = computed(() => ratingToneClass(rating.value))

const kdaClass = computed(() => kdaColorClass(kda(props.player)))

const damageDealt = computed(() => damageToChampionsFor(props.player, props.timeline))
const damageLabel = computed(() => formatCompact(damageDealt.value))

/** Relative to the side's top damage dealer, so each board reads on its own scale. */
const damageBarPercent = computed(() => {
  const max = props.team.reduce((m, p) => Math.max(m, damageToChampionsFor(p, props.timeline)), 0)
  return max <= 0 ? 0 : Math.max(2, (damageDealt.value / max) * 100)
})

const damageSplit = computed(() => {
  const split = damageSplitFor(props.player, props.timeline)
  if (split == null) return null
  const total = split.physical + split.magic + split.trueDamage
  return {
    physical: (split.physical / total) * 100,
    magic: (split.magic / total) * 100,
    trueDamage: (split.trueDamage / total) * 100,
  }
})

const damageTitle = computed(() => {
  const split = damageSplitFor(props.player, props.timeline)
  if (split == null) return 'Répartition physique / magique / brut indisponible (partie non synchronisée)'
  return `Physiques ${formatFull(split.physical)} · Magiques ${formatFull(split.magic)} · Bruts ${formatFull(split.trueDamage)}`
})

const goldLabel = computed(() => formatCompact(goldEarnedFor(props.player, props.timeline)))
const csPerMinuteLabel = computed(() => decimalLabel(props.player.stats?.csPerMinute ?? 0))
const csLabel = computed(() => `${creepScoreFor(props.player, props.timeline)} CS · ${csPerMinuteLabel.value}/min`)

const itemSlots = computed(() => getItemSlots(props.player))
const itemStyle = (item: number) => (item !== 0 ? { backgroundImage: `url('${getItemIconUrl(item, props.patch)}')` } : {})

// --- Advanced stats (the unfolded panel) ---
const hasAdvancedStats = computed(() => props.player.stats != null)

const advancedStats = computed<StatCell[]>(() => {
  const stats = props.player.stats
  if (!stats) return []
  return [
    { label: 'CS / min', value: decimalLabel(stats.csPerMinute) },
    { label: 'Dégâts / min', value: formatFull(stats.damagePerMinute) },
    { label: 'Or / min', value: formatFull(stats.goldPerMinute) },
    { label: 'Dégâts aux champions', value: formatFull(stats.damageDealtToChampions) },
    { label: 'Dégâts subis', value: formatFull(stats.damageTaken) },
    { label: 'Score de vision', value: String(props.player.visionScore) },
  ]
})

const yesNo = (value: boolean | number | undefined): string => (value ? 'Oui' : 'Non')
const count = (value: number | undefined): string => String(value ?? 0)
const percentOf = (ratio: number | undefined): string => `${Math.round((ratio ?? 0) * 100)} %`

const challengeStats = computed<StatCell[]>(() => {
  const c = props.player.challenges
  if (!c) return []
  return [
    { label: 'KDA (Riot)', value: decimalLabel(c.kda ?? 0, 2) },
    { label: 'Participation aux kills', value: percentOf(c.killParticipation) },
    { label: '% dégâts de l\'équipe', value: percentOf(c.teamDamagePercentage) },
    { label: 'Dégâts / min (Riot)', value: formatFull(c.damagePerMinute ?? 0) },
    { label: 'Or / min (Riot)', value: formatFull(c.goldPerMinute ?? 0) },
    { label: 'Score de vision / min', value: decimalLabel(c.visionScorePerMinute ?? 0, 2) },
    { label: 'Solo kills', value: count(c.soloKills) },
    { label: 'Wards détruites (takedowns)', value: count(c.wardTakedowns) },
    { label: 'Skillshots touchés / esquivés', value: `${count(c.skillshotsHit)} / ${count(c.skillshotsDodged)}` },
  ]
})

const moreChallengeGroups = computed<{ title: string, stats: StatCell[] }[]>(() => {
  const c = props.player.challenges
  if (!c) return []
  return [
    {
      title: 'Faits marquants',
      stats: [
        { label: 'Plus gros dégâts de la partie', value: yesNo(c.highestChampionDamage) },
        { label: 'Meilleur score de CC', value: yesNo(c.highestCrowdControlScore) },
        { label: 'Plus de wards détruites', value: yesNo(c.highestWardKills) },
        { label: 'Partie parfaite', value: yesNo(c.perfectGame) },
      ],
    },
    {
      title: 'Combat',
      stats: [
        { label: 'Multi-kills', value: count(c.multikills) },
        { label: 'Immobilisations infligées', value: count(c.enemyChampionImmobilizations) },
        { label: 'Kills après immo. (assisté)', value: count(c.immobilizeAndKillWithAlly) },
        { label: 'Picks réussis (assisté)', value: count(c.pickKillWithAlly) },
        { label: 'Kills en infériorité numérique', value: count(c.outnumberedKills) },
        { label: 'Survies à 3 immobilisations', value: count(c.survivedThreeImmobilizesInFight) },
        { label: 'Kills sous sa tourelle', value: count(c.killsUnderOwnTurret) },
        { label: 'Kills près de la tourelle adverse', value: count(c.killsNearEnemyTurret) },
      ],
    },
    {
      title: 'Objectifs',
      stats: [
        { label: 'Dragons pris', value: count(c.dragonTakedowns) },
        { label: 'Barons pris', value: count(c.baronTakedowns) },
        { label: 'Hérauts pris', value: count(c.riftHeraldTakedowns) },
        { label: 'Tourelles prises', value: count(c.turretTakedowns) },
      ],
    },
    {
      title: 'Tourelles & plaques',
      stats: [
        { label: 'Plaques de tourelle prises', value: count(c.turretPlatesTaken) },
        { label: 'Tourelles détruites avant la chute des plaques', value: count(c.kTurretsDestroyedBeforePlatesFall) },
        { label: 'Tourelles prises avec le Héraut', value: count(c.turretsTakenWithRiftHerald) },
        { label: 'Première tourelle rapide', value: yesNo(c.quickFirstTurret) },
      ],
    },
    {
      title: 'Farm & laning',
      stats: [
        { label: 'CS en 10 min', value: formatFull(c.laneMinionsFirst10Minutes ?? 0) },
        { label: 'Avance CS max sur l\'adversaire', value: decimalLabel(c.maxCsAdvantageOnLaneOpponent ?? 0, 1) },
        { label: 'CS jungle avant 10 min', value: decimalLabel(c.jungleCsBefore10Minutes ?? 0, 1) },
      ],
    },
    {
      title: 'Jungle',
      stats: [
        { label: 'Crabes-crevettes pris', value: count(c.scuttleCrabKills) },
        { label: 'Monstres de sa jungle tués', value: String(Math.round(c.alliedJungleMonsterKills ?? 0)) },
        { label: 'Monstres de la jungle adverse pris', value: String(Math.round(c.enemyJungleMonsterKills ?? 0)) },
        { label: 'Kills early jungle', value: count(c.junglerKillsEarlyJungle) },
      ],
    },
    {
      title: 'Vision',
      stats: [
        { label: 'Balises de contrôle posées', value: count(c.controlWardsPlaced) },
        { label: 'Balises furtives posées', value: count(c.stealthWardsPlaced) },
        { label: 'Avantage vision vs adversaire', value: decimalLabel(c.visionScoreAdvantageLaneOpponent ?? 0, 2) },
      ],
    },
    {
      title: 'Survie & soutien',
      stats: [
        { label: '% dégâts subis de l\'équipe', value: percentOf(c.damageTakenOnTeamPercentage) },
        { label: 'Soin / bouclier effectif', value: formatFull(c.effectiveHealAndShielding ?? 0) },
        { label: 'Alliés sauvés', value: count(c.saveAllyFromDeath) },
      ],
    },
  ]
})
</script>

<template>
  <div>
    <!-- Column widths and breakpoints below must stay in sync with the scoreboard's header row. -->
    <div
      class="flex cursor-pointer items-center gap-2.5 px-3.5 py-[11px] transition-colors duration-[120ms] ease-out sm:gap-3 sm:px-5"
      :class="rowClass"
      @click="selectPlayer"
    >
      <span class="flex min-w-0 flex-1 items-center gap-3">
        <span class="relative size-11 shrink-0">
          <span
            class="absolute inset-0 rounded-3 bg-sunken bg-[length:112%] bg-center"
            :class="isSelected ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : ''"
            :style="championStyle"
          />
          <span
            v-if="roleIconUrl"
            :title="roleLabel"
            class="absolute -left-1.5 -top-1.5 flex size-[19px] items-center justify-center rounded-full border-[1.5px] border-surface bg-night"
          >
            <img :src="roleIconUrl" alt="" class="size-[11px] brightness-0 invert">
          </span>
          <span
            class="type-mono absolute -bottom-1.5 -right-1.5 flex h-4 min-w-[18px] items-center justify-center rounded-1 bg-surface px-[3px] text-[10px] text-ink shadow-[0_0_0_1px_var(--line-strong)]"
          >{{ levelLabel }}</span>
        </span>

        <span class="flex min-w-0 flex-col gap-[3px]">
          <span class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <span class="min-w-0 truncate text-[0.875rem] font-[640] text-ink">{{ player.riotIdGameName }}<span class="type-mono ml-px font-normal text-ink-2">#{{ player.riotIdTagLine }}</span></span>

            <UiStatus v-if="isMe" variant="me" class="shrink-0" />
            <span
              v-else-if="isLinked"
              title="Joueur suivi par JungleDiff"
              class="inline-flex h-5 shrink-0 items-center rounded-1 bg-canopy-soft px-1.5 text-[11px] font-[650] text-canopy"
            >{{ crewLabel }}</span>

            <span v-if="isSmurf" class="group/smurf relative flex shrink-0 cursor-pointer" @click.stop>
              <NuxtLink
                v-if="primaryPlayerId"
                :to="`/summoner/${primaryPlayerId}`"
                :aria-label="`Smurf de ${primaryPlayerName || 'un joueur du crew'} : voir le compte principal`"
                class="inline-flex size-5 items-center justify-center rounded-1 border border-line-strong text-ink-2 transition-colors duration-[120ms] ease-out hover:bg-neutral-soft hover:text-ink"
              >
                <Icon name="lucide:bot" class="size-2.5" />
              </NuxtLink>
              <span class="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-2 bg-night px-2 py-1 text-[11px] font-medium text-on-night-2 shadow-float group-hover/smurf:block">
                Smurf de <span class="font-[650] text-on-night">{{ primaryPlayerName || 'Inconnu' }}</span>
              </span>
            </span>

            <span
              v-if="isMvp"
              title="Meilleur joueur de l'équipe gagnante"
              class="inline-flex h-5 shrink-0 items-center rounded-1 bg-ink px-1.5 text-[11px] font-[650] text-paper"
            >MVP</span>
            <span
              v-if="isAce"
              title="Meilleur joueur de l'équipe perdante"
              class="inline-flex h-5 shrink-0 items-center rounded-1 bg-violet-soft px-1.5 text-[11px] font-[650] text-violet-ink"
            >ACE</span>

            <!-- Only tracked players on a ranked game carry one; null means unknown, never 0. -->
            <LolRankChangeBadge v-if="player.rankChange != null" :change="player.rankChange" />

            <!-- Dropped on phones, where the name needs every pixel of the column. -->
            <span v-if="!isLinked" class="hidden shrink-0 items-center gap-1 sm:flex">
              <a
                :href="`https://www.op.gg/summoners/euw/${externalSlug}`"
                target="_blank"
                rel="noopener noreferrer"
                title="Accéder à OP.GG"
                class="group/ext flex size-5 items-center justify-center rounded-1 border border-line bg-sunken transition-colors duration-[120ms] ease-out hover:border-line-strong"
                @click.stop
              >
                <img src="/img/external/opgg.png" alt="OP.GG" class="size-3 rounded-[2px] opacity-70 grayscale transition-[filter,opacity] group-hover/ext:opacity-100 group-hover/ext:grayscale-0">
              </a>
              <a
                :href="`https://dpm.lol/${externalSlug}`"
                target="_blank"
                rel="noopener noreferrer"
                title="Accéder à DPM.LoL"
                class="group/ext flex size-5 items-center justify-center rounded-1 border border-line bg-sunken transition-colors duration-[120ms] ease-out hover:border-line-strong"
                @click.stop
              >
                <img src="/img/external/dpmlol.png" alt="DPM.LoL" class="size-3 rounded-[2px] opacity-70 grayscale transition-[filter,opacity] group-hover/ext:opacity-100 group-hover/ext:grayscale-0">
              </a>
            </span>
          </span>
          <span
            title="KP = part des éliminations de l'équipe auxquelles le joueur a contribué"
            class="truncate text-xs font-medium text-ink-2"
          >{{ subtitle }}</span>
        </span>
      </span>

      <span class="flex w-11 shrink-0 justify-center sm:w-[58px]">
        <span class="fig min-w-10 rounded-full px-1.5 py-[5px] text-center text-[15px] sm:min-w-11 sm:px-2" :class="ratingClass">{{ ratingLabel }}</span>
      </span>

      <span class="flex w-[72px] shrink-0 flex-col items-center gap-px sm:w-20">
        <span class="fig whitespace-nowrap text-[15px] text-ink sm:text-[16px]">{{ player.kills }} / {{ player.deaths }} / {{ player.assists }}</span>
        <span class="whitespace-nowrap text-[11px] font-semibold" :class="kdaClass">{{ kdaLabel(player) }} KDA</span>
      </span>

      <span :title="damageTitle" class="hidden w-40 shrink-0 items-center gap-2 lg:flex">
        <span class="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
          <span
            class="flex h-full overflow-hidden rounded-full transition-[width] duration-700 ease-out"
            :style="{ width: `${entered ? damageBarPercent : 0}%` }"
          >
            <template v-if="damageSplit">
              <span class="h-full bg-dmg-physical" :style="{ width: `${damageSplit.physical}%` }" />
              <span class="h-full bg-dmg-magic" :style="{ width: `${damageSplit.magic}%` }" />
              <span class="h-full bg-dmg-true" :style="{ width: `${damageSplit.trueDamage}%` }" />
            </template>
            <span v-else class="h-full w-full bg-ink-3" />
          </span>
        </span>
        <span class="fig w-[42px] text-right text-[15px] text-ink">{{ damageLabel }}</span>
      </span>

      <span class="hidden w-[104px] shrink-0 flex-col gap-px min-[560px]:flex">
        <span class="text-[12px] font-semibold text-ink-2"><span class="fig text-[15px] text-ink">{{ goldLabel }}</span> or</span>
        <span class="whitespace-nowrap text-[11.5px] font-medium text-ink-2">{{ csLabel }}</span>
      </span>

      <span class="fig hidden w-[58px] shrink-0 text-center text-[15px] text-ink rail:block">{{ player.visionScore }}</span>

      <span class="hidden w-[196px] shrink-0 gap-[3px] min-[700px]:flex">
        <span
          v-for="(item, index) in itemSlots"
          :key="index"
          class="size-6 shrink-0 rounded-1 bg-sunken bg-cover bg-center"
          :class="{ 'ml-1': index === itemSlots.length - 1 }"
          :style="itemStyle(item)"
        />
      </span>

      <button
        type="button"
        title="Statistiques avancées"
        :aria-expanded="showAdvancedStats"
        class="flex size-[30px] shrink-0 cursor-pointer items-center justify-center rounded-2 text-ink-2 transition-colors duration-[120ms] ease-out hover:bg-neutral-soft hover:text-ink"
        :class="{ 'bg-neutral-soft text-ink': showAdvancedStats }"
        @click.stop="showAdvancedStats = !showAdvancedStats"
      >
        <Icon
          name="lucide:chevron-down"
          class="size-[15px] transition-transform duration-200 ease-out"
          :class="{ 'rotate-180': showAdvancedStats }"
        />
      </button>
    </div>

    <div
      v-if="showAdvancedStats"
      class="border-t border-dashed border-line-strong bg-paper px-3.5 pb-[18px] pt-4 sm:px-5"
    >
      <div v-if="hasAdvancedStats" class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-[18px] gap-y-3">
        <span v-for="cell in advancedStats" :key="cell.label" class="flex flex-col gap-0.5">
          <span class="text-[11.5px] font-medium text-ink-2">{{ cell.label }}</span>
          <span class="fig text-[17px] text-ink">{{ cell.value }}</span>
        </span>
      </div>
      <p v-else class="type-small m-0 text-ink-2">
        Statistiques avancées indisponibles pour cette partie (historique non recalculé).
      </p>

      <template v-if="challengeStats.length > 0">
        <div class="my-3.5 h-0 border-t border-dashed border-line-strong" />
        <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-[18px] gap-y-3">
          <span v-for="cell in challengeStats" :key="cell.label" class="flex flex-col gap-0.5">
            <span class="text-[11.5px] font-medium text-ink-2">{{ cell.label }}</span>
            <span class="fig text-[17px] text-ink">{{ cell.value }}</span>
          </span>
        </div>

        <div v-if="showMoreChallenges" class="mt-4 flex flex-col gap-4">
          <div v-for="group in moreChallengeGroups" :key="group.title">
            <p class="type-label m-0 mb-2 text-ink-2">{{ group.title }}</p>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-[18px] gap-y-3">
              <span v-for="cell in group.stats" :key="cell.label" class="flex flex-col gap-0.5">
                <span class="text-[11.5px] font-medium text-ink-2">{{ cell.label }}</span>
                <span class="fig text-[17px] text-ink">{{ cell.value }}</span>
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="mt-3.5 inline-flex cursor-pointer text-[0.8125rem] font-semibold text-canopy hover:underline hover:underline-offset-[3px]"
          @click.stop="showMoreChallenges = !showMoreChallenges"
        >
          {{ showMoreChallenges ? 'Voir moins' : 'Voir plus de statistiques →' }}
        </button>
      </template>
    </div>
  </div>
</template>
