<template>
  <div>
    <!--
      Column widths and the container breakpoints below must stay in
      sync with the scoreboard's header row.
    -->
    <div
      class="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 transition-colors"
      :class="rowClass"
      @click="selectPlayer"
    >
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <div class="relative shrink-0">
          <img
            class="h-11 w-11 rounded-lg border border-white/20 object-cover"
            :src="championIconUrl"
            :alt="player.championName"
          />

          <img
            v-if="roleIconUrl"
            class="border-border-base bg-bg-base absolute -left-1.5 -top-1.5 h-4 w-4 rounded-full border p-0.5"
            :src="roleIconUrl"
            :title="roleLabelStr"
            alt=""
          />

          <span
            class="bg-bg-base text-text-main border-border-base absolute -bottom-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full border text-[10px] font-semibold"
          >
            {{ player.champLevel == null || player.champLevel === 0 ? "??" : player.champLevel }}
          </span>
        </div>

        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-1.5">
            <p class="text-text-main truncate text-sm font-semibold">
              {{ player.riotIdGameName }}<span class="text-text-ter font-normal">#{{ player.riotIdTagLine }}</span>
            </p>

            <span
              v-if="isLinked"
              class="bg-brand-green/15 text-brand-green whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            >
              {{ displayName }}
            </span>

            <span
              v-if="isMvp"
              class="bg-brand-gold/20 text-brand-gold whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold"
            >
              MVP
            </span>

            <span
              v-if="isAce"
              class="light:text-purple-700 whitespace-nowrap rounded-full bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300"
            >
              ACE
            </span>
          </div>

          <p
            class="text-text-ter mt-0.5 truncate text-xs"
            title="KP = part des éliminations de l'équipe auxquelles le joueur a contribué"
          >
            {{ subtitle }}
          </p>
        </div>
      </div>

      <div class="w-[58px] shrink-0 text-center">
        <span
          class="inline-flex min-w-[46px] justify-center rounded-lg border px-2 py-1 text-[13px] font-bold"
          :class="ratingTone"
        >
          {{ ratingLabel }}
        </span>
      </div>

      <div class="w-[76px] shrink-0 text-center">
        <p class="text-text-main text-sm font-semibold">
          {{ player.kills }} / {{ player.deaths }} / {{ player.assists }}
        </p>
        <p class="text-[11px] font-medium" :class="kdaColorClassStr">
          {{ kdaLabelStr }} KDA
        </p>
      </div>

      <div
        class="hidden lg:flex w-40 shrink-0 items-center gap-2"
        :title="damageTitle"
      >
        <div class="light:bg-[rgba(23,30,54,0.06)] h-2 flex-1 overflow-hidden rounded-full bg-white/10">
          <div class="flex h-full" :style="{ width: damageBarPercent + '%' }">
            <template v-if="damageSplit">
              <div class="bg-brand-gold h-full" :style="{ width: damageSplit.physical + '%' }"></div>
              <div class="bg-blue-400 h-full" :style="{ width: damageSplit.magic + '%' }"></div>
              <div class="h-full bg-white/70" :style="{ width: damageSplit.trueDamage + '%' }"></div>
            </template>
            <template v-else>
              <div class="light:bg-[rgba(23,30,54,0.35)] h-full w-full bg-white/40"></div>
            </template>
          </div>
        </div>
        <span class="text-text-sec w-11 text-right text-[11px]">
          {{ damageLabel }}
        </span>
      </div>

      <div class="hidden min-[520px]:block w-[104px] shrink-0">
        <p class="text-text-main text-[13px] font-semibold">{{ goldLabel }} or</p>
        <p class="text-text-ter text-[11px]">
          {{ cs }} CS &middot; {{ csPerMinuteLabel }}/min
        </p>
      </div>

      <div class="hidden min-[1100px]:block w-[58px] shrink-0 text-center">
        <p class="text-text-main text-[13px] font-semibold">
          {{ player.visionScore }}
        </p>
        <p class="text-text-ter text-[11px]">vision</p>
      </div>

      <div class="hidden min-[660px]:flex shrink-0 items-center gap-1">
        <div
          v-for="(item, index) in itemSlotsArr"
          :key="index"
          class="border-border-base light:bg-[rgba(23,30,54,0.03)] h-6 w-6 overflow-hidden rounded-md border bg-white/5"
          :class="index === itemSlotsArr.length - 1 ? 'ml-1' : ''"
        >
          <img v-if="item !== 0" class="h-full w-full object-cover" :src="itemIconUrl(item)" alt="" />
        </div>
      </div>

      <button
        type="button"
        class="text-text-ter hover:text-text-main light:hover:bg-[rgba(23,30,54,0.06)] shrink-0 rounded-full p-1.5 transition-colors hover:bg-white/10"
        :aria-expanded="showAdvancedStats"
        title="Statistiques avancées"
        @click.stop="toggleAdvancedStats"
      >
        <Icon
          name="lucide:chevron-down"
          class="block w-4 h-4 transition-transform"
          :class="showAdvancedStats ? 'rotate-180' : ''"
        />
      </button>
    </div>

    <div v-if="showAdvancedStats" class="border-border-base light:bg-[rgba(23,30,54,0.02)] bg-white/5 border-t px-4 py-3">
      <div v-if="hasAdvancedStats" class="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-3">
        <div>
          <p class="text-text-ter">CS/min</p>
          <p class="text-text-main font-semibold">{{ csPerMinuteLabel }}</p>
        </div>
        <div>
          <p class="text-text-ter">Dégâts/min</p>
          <p class="text-text-main font-semibold">{{ damagePerMinuteLabel }}</p>
        </div>
        <div>
          <p class="text-text-ter">Or/min</p>
          <p class="text-text-main font-semibold">{{ goldPerMinuteLabel }}</p>
        </div>
        <div>
          <p class="text-text-ter">Dégâts aux champions</p>
          <p class="text-text-main font-semibold">{{ damageDealtToChampionsLabel }}</p>
        </div>
        <div>
          <p class="text-text-ter">Dégâts subis</p>
          <p class="text-text-main font-semibold">{{ damageTakenLabel }}</p>
        </div>
        <div>
          <p class="text-text-ter">Score de vision</p>
          <p class="text-text-main font-semibold">{{ player.visionScore }}</p>
        </div>
      </div>
      <div v-else>
        <p class="text-text-ter text-xs">Statistiques avancées indisponibles pour cette partie (historique non recalculé).</p>
      </div>

      <template v-if="hasChallenges">
        <div class="border-border-base mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t pt-3 text-xs sm:grid-cols-3">
          <div><p class="text-text-ter">KDA (Riot)</p><p class="text-text-main font-semibold">{{ challengeKdaLabel }}</p></div>
          <div><p class="text-text-ter">Participation aux kills</p><p class="text-text-main font-semibold">{{ challengeKillParticipationPercent }}%</p></div>
          <div><p class="text-text-ter">% dégâts de l'équipe</p><p class="text-text-main font-semibold">{{ challengeTeamDamagePercent }}%</p></div>
          <div><p class="text-text-ter">Dégâts/min (Riot)</p><p class="text-text-main font-semibold">{{ challengeDamagePerMinuteLabel }}</p></div>
          <div><p class="text-text-ter">Or/min (Riot)</p><p class="text-text-main font-semibold">{{ challengeGoldPerMinuteLabel }}</p></div>
          <div><p class="text-text-ter">Score de vision/min</p><p class="text-text-main font-semibold">{{ challengeVisionScorePerMinuteLabel }}</p></div>
          <div><p class="text-text-ter">Solo kills</p><p class="text-text-main font-semibold">{{ challengeSoloKills }}</p></div>
          <div><p class="text-text-ter">Wards détruites (takedowns)</p><p class="text-text-main font-semibold">{{ challengeWardTakedowns }}</p></div>
          <div><p class="text-text-ter">Skillshots touchés / esquivés</p><p class="text-text-main font-semibold">{{ challengeSkillshotsHit }} / {{ challengeSkillshotsDodged }}</p></div>
        </div>

        <button
          type="button"
          class="text-text-sec hover:text-text-main mt-3 text-xs font-medium underline decoration-dotted underline-offset-2"
          @click.stop="toggleMoreChallenges"
        >
          {{ showMoreChallenges ? "Voir moins" : "Voir plus de statistiques" }}
        </button>

        <div v-if="showMoreChallenges" class="mt-3 space-y-3 text-xs">
          <!-- Faits marquants -->
          <div>
            <p class="text-text-ter mb-1.5 text-[10px] font-semibold uppercase tracking-wide">Faits marquants</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              <div><p class="text-text-ter">Plus gros dégâts de la partie</p><p class="text-text-main font-semibold">{{ challengeHighestChampionDamageLabel }}</p></div>
              <div><p class="text-text-ter">Meilleur score de CC</p><p class="text-text-main font-semibold">{{ challengeHighestCrowdControlScoreLabel }}</p></div>
              <div><p class="text-text-ter">Plus de wards détruites</p><p class="text-text-main font-semibold">{{ challengeHighestWardKillsLabel }}</p></div>
              <div><p class="text-text-ter">Partie parfaite</p><p class="text-text-main font-semibold">{{ challengePerfectGameLabel }}</p></div>
            </div>
          </div>
          <!-- Combat -->
          <div>
            <p class="text-text-ter mb-1.5 text-[10px] font-semibold uppercase tracking-wide">Combat</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              <div><p class="text-text-ter">Multi-kills</p><p class="text-text-main font-semibold">{{ challengeMultikills }}</p></div>
              <div><p class="text-text-ter">Immobilisations infligées</p><p class="text-text-main font-semibold">{{ challengeEnemyChampionImmobilizations }}</p></div>
              <div><p class="text-text-ter">Kills après immo. (assisté)</p><p class="text-text-main font-semibold">{{ challengeImmobilizeAndKillWithAlly }}</p></div>
              <div><p class="text-text-ter">Picks réussis (assisté)</p><p class="text-text-main font-semibold">{{ challengePickKillWithAlly }}</p></div>
              <div><p class="text-text-ter">Kills en infériorité numérique</p><p class="text-text-main font-semibold">{{ challengeOutnumberedKills }}</p></div>
              <div><p class="text-text-ter">Survies à 3 immobilisations</p><p class="text-text-main font-semibold">{{ challengeSurvivedThreeImmobilizesInFight }}</p></div>
              <div><p class="text-text-ter">Kills sous sa tourelle</p><p class="text-text-main font-semibold">{{ challengeKillsUnderOwnTurret }}</p></div>
              <div><p class="text-text-ter">Kills près de la tourelle adverse</p><p class="text-text-main font-semibold">{{ challengeKillsNearEnemyTurret }}</p></div>
            </div>
          </div>
          <!-- Objectifs -->
          <div>
            <p class="text-text-ter mb-1.5 text-[10px] font-semibold uppercase tracking-wide">Objectifs</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              <div><p class="text-text-ter">Dragons pris</p><p class="text-text-main font-semibold">{{ challengeDragonTakedowns }}</p></div>
              <div><p class="text-text-ter">Barons pris</p><p class="text-text-main font-semibold">{{ challengeBaronTakedowns }}</p></div>
              <div><p class="text-text-ter">Hérauts pris</p><p class="text-text-main font-semibold">{{ challengeRiftHeraldTakedowns }}</p></div>
              <div><p class="text-text-ter">Tourelles prises</p><p class="text-text-main font-semibold">{{ challengeTurretTakedowns }}</p></div>
            </div>
          </div>
          <!-- Tourelles & plaques -->
          <div>
            <p class="text-text-ter mb-1.5 text-[10px] font-semibold uppercase tracking-wide">Tourelles &amp; plaques</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              <div><p class="text-text-ter">Plaques de tourelle prises</p><p class="text-text-main font-semibold">{{ challengeTurretPlatesTaken }}</p></div>
              <div><p class="text-text-ter">Tourelles détruites avant la chute des plaques</p><p class="text-text-main font-semibold">{{ challengeKTurretsDestroyedBeforePlatesFall }}</p></div>
              <div><p class="text-text-ter">Tourelles prises avec le Héraut</p><p class="text-text-main font-semibold">{{ challengeTurretsTakenWithRiftHerald }}</p></div>
              <div><p class="text-text-ter">Première tourelle rapide</p><p class="text-text-main font-semibold">{{ challengeQuickFirstTurretLabel }}</p></div>
            </div>
          </div>
          <!-- Farm & laning -->
          <div>
            <p class="text-text-ter mb-1.5 text-[10px] font-semibold uppercase tracking-wide">Farm &amp; laning</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              <div><p class="text-text-ter">CS en 10 min</p><p class="text-text-main font-semibold">{{ challengeLaneMinionsFirst10MinutesLabel }}</p></div>
              <div><p class="text-text-ter">Avance CS max sur l'adversaire</p><p class="text-text-main font-semibold">{{ challengeMaxCsAdvantageLabel }}</p></div>
              <div><p class="text-text-ter">CS jungle avant 10 min</p><p class="text-text-main font-semibold">{{ challengeJungleCsBefore10MinutesLabel }}</p></div>
            </div>
          </div>
          <!-- Jungle -->
          <div>
            <p class="text-text-ter mb-1.5 text-[10px] font-semibold uppercase tracking-wide">Jungle</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              <div><p class="text-text-ter">Crabes-crevettes pris</p><p class="text-text-main font-semibold">{{ challengeScuttleCrabKills }}</p></div>
              <div><p class="text-text-ter">Monstres de sa jungle tués</p><p class="text-text-main font-semibold">{{ challengeAlliedJungleMonsterKills }}</p></div>
              <div><p class="text-text-ter">Monstres de la jungle adverse pris</p><p class="text-text-main font-semibold">{{ challengeEnemyJungleMonsterKills }}</p></div>
              <div><p class="text-text-ter">Kills early jungle</p><p class="text-text-main font-semibold">{{ challengeJunglerKillsEarlyJungle }}</p></div>
            </div>
          </div>
          <!-- Vision -->
          <div>
            <p class="text-text-ter mb-1.5 text-[10px] font-semibold uppercase tracking-wide">Vision</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              <div><p class="text-text-ter">Balises de contrôle posées</p><p class="text-text-main font-semibold">{{ challengeControlWardsPlaced }}</p></div>
              <div><p class="text-text-ter">Balises furtives posées</p><p class="text-text-main font-semibold">{{ challengeStealthWardsPlaced }}</p></div>
              <div><p class="text-text-ter">Avantage vision vs adversaire</p><p class="text-text-main font-semibold">{{ challengeVisionScoreAdvantageLabel }}</p></div>
            </div>
          </div>
          <!-- Survie & soutien -->
          <div>
            <p class="text-text-ter mb-1.5 text-[10px] font-semibold uppercase tracking-wide">Survie &amp; soutien</p>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
              <div><p class="text-text-ter">% dégâts subis de l'équipe</p><p class="text-text-main font-semibold">{{ challengeDamageTakenOnTeamPercent }}%</p></div>
              <div><p class="text-text-ter">Soin / bouclier effectif</p><p class="text-text-main font-semibold">{{ challengeEffectiveHealAndShieldingLabel }}</p></div>
              <div><p class="text-text-ter">Alliés sauvés</p><p class="text-text-main font-semibold">{{ challengeSaveAllyFromDeath }}</p></div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
import {
  roleIconUrl as getRoleIconUrl,
  roleLabel as getRoleLabel,
} from '~/utils/lol-role'

const props = defineProps<{
  player: LoLGameParticipantDto
  team: LoLGameParticipantDto[]
  timeline?: LoLGameTimelineFrame[]
  isSelected: boolean
  isMvp: boolean
  isAce: boolean
  patch: string
  durationSeconds: number
}>()

const emit = defineEmits<{
  (e: 'playerSelected', player: LoLGameParticipantDto): void
}>()

const showAdvancedStats = ref(false)
const showMoreChallenges = ref(false)

const selectPlayer = () => {
  emit('playerSelected', props.player)
}

const toggleAdvancedStats = () => {
  showAdvancedStats.value = !showAdvancedStats.value
}

const toggleMoreChallenges = () => {
  showMoreChallenges.value = !showMoreChallenges.value
}

// Map Tailwind colors dynamically instead of old angular `mpX` ones
const mapTone = (oldClass: string): string => {
  if (oldClass.includes('Yellow')) return 'text-brand-gold border-brand-gold/45 bg-brand-gold/15'
  if (oldClass.includes('Green')) return 'text-brand-green border-brand-green/45 bg-brand-green/15'
  if (oldClass.includes('Blue')) return 'text-blue-400 border-blue-400/45 bg-blue-400/15'
  return 'text-text-sec border-border-base bg-white/5'
}

const rowClass = computed(() => {
  if (props.isMvp) {
    return props.isSelected
      ? 'bg-brand-gold/20'
      : 'bg-brand-gold/10 hover:bg-brand-gold/15'
  }
  return props.isSelected
    ? 'light:bg-[rgba(23,30,54,0.06)] bg-white/10'
    : 'light:hover:bg-[rgba(23,30,54,0.04)] hover:bg-white/5'
})

const itemSlotsArr = computed(() => getItemSlots(props.player))

const rating = computed(() => ratingFor(props.player, props.team, props.timeline, props.durationSeconds))
const ratingLabel = computed(() => decimalLabel(rating.value, 1))
const ratingTone = computed(() => mapTone(ratingToneClass(rating.value)))

const damageDealt = computed(() => damageToChampionsFor(props.player, props.timeline))
const damageLabel = computed(() => formatCompact(damageDealt.value))
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
  return `Physique ${formatFull(split.physical)} · Magique ${formatFull(split.magic)} · Brut ${formatFull(split.trueDamage)}`
})

const currentGold = computed(() => goldEarnedFor(props.player, props.timeline))
const goldLabel = computed(() => formatCompact(currentGold.value))
const cs = computed(() => creepScoreFor(props.player, props.timeline))
const killParticipation = computed(() => killParticipationFor(props.player, props.team))

const hasAdvancedStats = computed(() => props.player.stats != null)
const csPerMinuteLabel = computed(() => decimalLabel(props.player.stats?.csPerMinute ?? 0))
const damageDealtToChampionsLabel = computed(() => formatFull(props.player.stats?.damageDealtToChampions ?? 0))
const damagePerMinuteLabel = computed(() => formatFull(props.player.stats?.damagePerMinute ?? 0))
const goldPerMinuteLabel = computed(() => formatFull(props.player.stats?.goldPerMinute ?? 0))
const damageTakenLabel = computed(() => formatFull(props.player.stats?.damageTaken ?? 0))

const kdaValue = computed(() => kda(props.player))
const kdaLabelStr = computed(() => kdaLabel(props.player))
const kdaColorClassStr = computed(() => {
  const c = kdaColorClass(kdaValue.value)
  if (c.includes('Green')) return 'text-brand-green'
  if (c.includes('Yellow')) return 'text-brand-gold'
  return 'text-text-sec'
})

const roleLabelStr = computed(() => getRoleLabel(props.player.teamPosition))
const roleIconUrl = computed(() => getRoleIconUrl(props.player.teamPosition))
const subtitle = computed(() => [
  props.player.championName ?? '',
  roleLabelStr.value,
  `KP ${killParticipation.value}%`
].filter(p => p !== '').join(' · '))
const displayName = computed(() => playerDisplayName(props.player))
const isLinked = computed(() => props.player.player != null)

const championIconUrl = computed(() => getChampionIconUrl(props.player.championName, props.patch))
const itemIconUrl = (item: number) => getItemIconUrl(item, props.patch)

const hasChallenges = computed(() => props.player.challenges != null)
const challengeKdaLabel = computed(() => decimalLabel(props.player.challenges?.kda ?? 0, 2))
const challengeKillParticipationPercent = computed(() => Math.round((props.player.challenges?.killParticipation ?? 0) * 100))
const challengeTeamDamagePercent = computed(() => Math.round((props.player.challenges?.teamDamagePercentage ?? 0) * 100))
const challengeDamagePerMinuteLabel = computed(() => formatFull(props.player.challenges?.damagePerMinute ?? 0))
const challengeGoldPerMinuteLabel = computed(() => formatFull(props.player.challenges?.goldPerMinute ?? 0))
const challengeVisionScorePerMinuteLabel = computed(() => decimalLabel(props.player.challenges?.visionScorePerMinute ?? 0, 2))
const challengeSoloKills = computed(() => props.player.challenges?.soloKills ?? 0)
const challengeWardTakedowns = computed(() => props.player.challenges?.wardTakedowns ?? 0)
const challengeSkillshotsHit = computed(() => props.player.challenges?.skillshotsHit ?? 0)
const challengeSkillshotsDodged = computed(() => props.player.challenges?.skillshotsDodged ?? 0)

const challengeHighestChampionDamageLabel = computed(() => props.player.challenges?.highestChampionDamage ? 'Oui' : 'Non')
const challengeHighestCrowdControlScoreLabel = computed(() => props.player.challenges?.highestCrowdControlScore ? 'Oui' : 'Non')
const challengeHighestWardKillsLabel = computed(() => props.player.challenges?.highestWardKills ? 'Oui' : 'Non')
const challengePerfectGameLabel = computed(() => props.player.challenges?.perfectGame ? 'Oui' : 'Non')
const challengeMultikills = computed(() => props.player.challenges?.multikills ?? 0)
const challengeEnemyChampionImmobilizations = computed(() => props.player.challenges?.enemyChampionImmobilizations ?? 0)
const challengeImmobilizeAndKillWithAlly = computed(() => props.player.challenges?.immobilizeAndKillWithAlly ?? 0)
const challengePickKillWithAlly = computed(() => props.player.challenges?.pickKillWithAlly ?? 0)
const challengeOutnumberedKills = computed(() => props.player.challenges?.outnumberedKills ?? 0)
const challengeSurvivedThreeImmobilizesInFight = computed(() => props.player.challenges?.survivedThreeImmobilizesInFight ?? 0)
const challengeKillsUnderOwnTurret = computed(() => props.player.challenges?.killsUnderOwnTurret ?? 0)
const challengeKillsNearEnemyTurret = computed(() => props.player.challenges?.killsNearEnemyTurret ?? 0)
const challengeDragonTakedowns = computed(() => props.player.challenges?.dragonTakedowns ?? 0)
const challengeBaronTakedowns = computed(() => props.player.challenges?.baronTakedowns ?? 0)
const challengeRiftHeraldTakedowns = computed(() => props.player.challenges?.riftHeraldTakedowns ?? 0)
const challengeTurretTakedowns = computed(() => props.player.challenges?.turretTakedowns ?? 0)
const challengeTurretPlatesTaken = computed(() => props.player.challenges?.turretPlatesTaken ?? 0)
const challengeKTurretsDestroyedBeforePlatesFall = computed(() => props.player.challenges?.kTurretsDestroyedBeforePlatesFall ?? 0)
const challengeTurretsTakenWithRiftHerald = computed(() => props.player.challenges?.turretsTakenWithRiftHerald ?? 0)
const challengeQuickFirstTurretLabel = computed(() => props.player.challenges?.quickFirstTurret ? 'Oui' : 'Non')
const challengeLaneMinionsFirst10MinutesLabel = computed(() => formatFull(props.player.challenges?.laneMinionsFirst10Minutes ?? 0))
const challengeMaxCsAdvantageLabel = computed(() => decimalLabel(props.player.challenges?.maxCsAdvantageOnLaneOpponent ?? 0, 1))
const challengeJungleCsBefore10MinutesLabel = computed(() => decimalLabel(props.player.challenges?.jungleCsBefore10Minutes ?? 0, 1))
const challengeScuttleCrabKills = computed(() => props.player.challenges?.scuttleCrabKills ?? 0)
const challengeAlliedJungleMonsterKills = computed(() => Math.round(props.player.challenges?.alliedJungleMonsterKills ?? 0))
const challengeEnemyJungleMonsterKills = computed(() => Math.round(props.player.challenges?.enemyJungleMonsterKills ?? 0))
const challengeJunglerKillsEarlyJungle = computed(() => props.player.challenges?.junglerKillsEarlyJungle ?? 0)
const challengeControlWardsPlaced = computed(() => props.player.challenges?.controlWardsPlaced ?? 0)
const challengeStealthWardsPlaced = computed(() => props.player.challenges?.stealthWardsPlaced ?? 0)
const challengeVisionScoreAdvantageLabel = computed(() => decimalLabel(props.player.challenges?.visionScoreAdvantageLaneOpponent ?? 0, 2))
const challengeDamageTakenOnTeamPercent = computed(() => Math.round((props.player.challenges?.damageTakenOnTeamPercentage ?? 0) * 100))
const challengeEffectiveHealAndShieldingLabel = computed(() => formatFull(props.player.challenges?.effectiveHealAndShielding ?? 0))
const challengeSaveAllyFromDeath = computed(() => props.player.challenges?.saveAllyFromDeath ?? 0)
</script>
