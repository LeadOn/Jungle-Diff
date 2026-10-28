<script setup lang="ts">
import { computed } from 'vue'
import type { LeaguePlayer, LoLFactOfTheWeekDto } from '~/lib/types'
import { usePatchStore } from '~/stores/patch'
import { getProfileIconUrl } from '~/utils/ddragon'
import { championSplashUrl } from '~/utils/lol-champion'
import { tierEmblemUrl, tierLabel } from '~/utils/lol-tier'
import { playerDisplayName } from '~/utils/lol-ladder'
import { formatSigned } from '~/utils/number'

/**
 * `factOfTheWeek` from `/lol/Home`: the best net LP swing over the last 7 days (the home page asks
 * for `window=Last7Days`), told as a Canopée feature card on `--night`.
 */
const props = defineProps<{
  fact: LoLFactOfTheWeekDto
  /** The crew list, for the player's current Solo/Duo rank and main champion (the fact carries neither). */
  players: LeaguePlayer[]
}>()

const patchStore = usePatchStore()

const playerId = computed(() => props.fact.player.id)
const name = computed(() => playerDisplayName(props.fact.player))
const crewPlayer = computed(() => props.players.find(player => player.id === playerId.value) ?? null)
const soloRank = computed(() => crewPlayer.value?.leagueOfLegendsSoloRank ?? null)

const iconUrl = computed(() => (props.fact.player.lolIconId != null
  ? getProfileIconUrl(props.fact.player.lolIconId, patchStore.currentPatch)
  : null))

// `mainChampionName` is only served by the crew list, not on the fact's own player.
const mainChampion = computed(() => crewPlayer.value?.mainChampionName ?? null)
const splashUrl = computed(() => (mainChampion.value ? championSplashUrl(mainChampion.value) : null))
</script>

<template>
  <section aria-labelledby="player-of-the-week" class="feature">
    <div class="feature-art">
      <img v-if="splashUrl" :src="splashUrl" alt="">
    </div>

    <div class="feature-body">
      <span id="player-of-the-week" class="type-label text-on-night-gold">Joueur de la semaine</span>

      <div class="feature-id">
        <span class="feature-av">
          <img v-if="iconUrl" :src="iconUrl" alt="">
        </span>
        <span class="min-w-0">
          <b>{{ name }}</b>
          <span v-if="soloRank" class="rk">
            <img :src="tierEmblemUrl(soloRank)" alt="">
            {{ tierLabel(soloRank) }} · {{ soloRank.leaguePoints }} LP
          </span>
        </span>
      </div>

      <div class="feature-fig" :class="fact.lpChange < 0 ? 'text-on-night-loss' : 'text-on-night-win'">
        <span class="fig">{{ formatSigned(fact.lpChange) }}</span>
        <small>LP en 7 jours</small>
      </div>

      <div class="feature-stats">
        <div>
          <span class="fig">{{ fact.gamesThisWeek }}</span>
          <span>partie{{ fact.gamesThisWeek > 1 ? 's' : '' }}</span>
        </div>
        <div>
          <span class="fig">{{ Math.round(fact.winRateThisWeek) }} %</span>
          <span>victoires</span>
        </div>
        <div>
          <span class="fig">{{ fact.longestWinStreakThisWeek }}</span>
          <span>victoires d'affilée</span>
        </div>
      </div>

      <UiButton :to="`/summoner/${playerId}`" variant="night" block>
        Voir sa fiche
        <Icon name="lucide:arrow-right" class="size-4" />
      </UiButton>
    </div>
  </section>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.feature {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-5);
  background: var(--night);
  color: var(--on-night);
}

.feature-art {
  position: relative;
  height: 148px;
  background: var(--night-2);
}

.feature-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 22%;
}

.feature-art::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--scrim-rise-value);
}

.feature-body {
  position: relative;
  display: grid;
  gap: 14px;
  padding: 0 18px 18px;
  margin-top: -44px;
}

.feature-id {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-av {
  width: 46px;
  height: 46px;
  flex: none;
  border-radius: 50%;
  overflow: hidden;
  background: var(--night-2);
  box-shadow: 0 0 0 2px var(--night), 0 0 0 3px var(--on-night-gold);
}

.feature-av img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.feature-id b {
  display: block;
  font-stretch: 118%;
  font-weight: 740;
  font-size: 1.25rem;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feature-id .rk {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8125rem;
  color: var(--on-night-2);
}

.feature-id .rk img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.feature-fig {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.feature-fig .fig {
  font-size: 4.25rem;
}

.feature-fig small {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--on-night-2);
}

.feature-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px solid var(--on-night-line);
}

.feature-stats div {
  padding-top: 10px;
  display: grid;
  gap: 2px;
}

.feature-stats div + div {
  padding-left: 12px;
  border-left: 1px solid var(--on-night-line);
}

.feature-stats .fig {
  font-size: 1.5rem;
}

.feature-stats span:not(.fig) {
  font-size: 11.5px;
  color: var(--on-night-2);
}
</style>
