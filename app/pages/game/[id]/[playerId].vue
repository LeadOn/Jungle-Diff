<script setup lang="ts">
import {ref, computed, onMounted, watch} from "vue";
import type {LoLGameParticipantDto} from "~/lib/types/match";
import {useRoute, useAsyncData} from "#app";
import {useGameOnLol} from "~/composables/useGameOnLol";
import {formatQueue} from "~/lib/utils/lol";
import {useLolStore} from "~/stores/lol";
import {usePlayerStore} from "~/stores/player";

import LolGameHeader from "~/components/lol/game/LolGameHeader.vue";
import LolGameObjectives from "~/components/lol/game/LolGameObjectives.vue";
import LolGameTabs from "~/components/lol/game/LolGameTabs.vue";
import LolGameOverviewTab from "~/components/lol/game/LolGameOverviewTab.vue";
import LolGameHighlights from "~/components/lol/game/LolGameHighlights.vue";
import LolGameKeyMoments from "~/components/lol/game/LolGameKeyMoments.vue";

import LolGameEventTimeline from "~/components/lol/game/LolGameEventTimeline.vue";
import LolGameMinimap from "~/components/lol/game/LolGameMinimap.vue";
import LolGameGoldRace from "~/components/lol/game/LolGameGoldRace.vue";
import LolGameKillFeed from "~/components/lol/game/LolGameKillFeed.vue";
import LolGameGoldChart from "~/components/lol/game/LolGameGoldChart.vue";
import LolGameStatChart from "~/components/lol/game/LolGameStatChart.vue";

import LolGamePlayerPicker from "~/components/lol/game/LolGamePlayerPicker.vue";
import LolGamePlayerPerformance from "~/components/lol/game/LolGamePlayerPerformance.vue";
import LolGamePlayerRadar from "~/components/lol/game/LolGamePlayerRadar.vue";
import LolGamePlayerDamageProfile from "~/components/lol/game/LolGamePlayerDamageProfile.vue";
import LolGamePlayerGold from "~/components/lol/game/LolGamePlayerGold.vue";
import LolGameDamageChart from "~/components/lol/game/LolGameDamageChart.vue";
import LolGameRankingChart from "~/components/lol/game/LolGameRankingChart.vue";
import LolGameRawStatsTable from "~/components/lol/game/LolGameRawStatsTable.vue";
import LolGameCoachReport from "~/components/lol/game/LolGameCoachReport.vue";

import {
  compositeScore,
  bestParticipant,
  durationSecondsFor,
  closestDdragonVersion,
  playerRiotName,
} from "~/utils/lol-match";

const route = useRoute();
const gameOnApi = useGameOnLol();
const lolStore = useLolStore();
const playerStore = usePlayerStore();

const matchId = route.params.id as string;
const playerId = route.params.playerId
  ? Number(route.params.playerId)
  : undefined;

const {
  data: match,
  status,
  error,
  refresh,
} = await useAsyncData(`match-${matchId}`, () => gameOnApi.getMatch(matchId));

/**
 * An unknown match is a genuine 404, raised here and not inside the handler: `useAsyncData`
 * captures whatever the handler throws into `error`, so a `createError` raised in there would never
 * reach Nuxt and the response would stay 200 — which is what made crawlers and monitoring probes
 * treat an error page as a valid one.
 *
 * The empty check is not redundant: the GameOn API answers an unknown match id with `204 No
 * Content` rather than a 404, which reaches us as a successful call carrying no data.
 */
if (error.value?.statusCode === 404 || !match.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Partie introuvable",
    fatal: true,
  });
}

// The timeline enriches the page (replay, minimap, charts) but does not gate it: its absence
// degrades the display instead of failing it.
const {data: timeline, refresh: refreshTimeline} = await useAsyncData(`timeline-${matchId}`, () =>
  gameOnApi.getGameTimeline(matchId).catch((e: unknown) => {
    console.error("[game] Timeline indisponible:", e);
    return null;
  }),
);

const team1 = computed(
  () =>
    match.value?.leagueOfLegendsGameParticipants.filter(
      (p: LoLGameParticipantDto) => p.teamId === 100,
    ) || [],
);
const team2 = computed(
  () =>
    match.value?.leagueOfLegendsGameParticipants.filter(
      (p: LoLGameParticipantDto) => p.teamId === 200,
    ) || [],
);
const allPlayers = computed(
  () => match.value?.leagueOfLegendsGameParticipants || [],
);

const heroPlayer = computed(() => {
  if (!match.value) return undefined;
  if (playerId) {
    return match.value.leagueOfLegendsGameParticipants.find(
      (p: LoLGameParticipantDto) => p.playerId === playerId,
    );
  }
  return match.value.leagueOfLegendsGameParticipants[0];
});

const patch = computed(() => {
  if (!match.value?.gameVersion) return "";
  return closestDdragonVersion(match.value.gameVersion, lolStore.versions);
});
const queueLabel = computed(() => {
  if (!match.value || match.value.queueId == null) return "";
  return formatQueue(match.value.queueId, lolStore.queues);
});

/**
 * Who is looking only matters for the "Vous" badges, and it is resolved after mount: the signed-in
 * player is fetched client-side by the header, so the server render never carries it and the first
 * client render must not either, or hydration would disagree.
 */
const isMounted = ref(false);
const mePlayerId = computed(() =>
  isMounted.value ? (playerStore.currentPlayer?.id ?? null) : null,
);

onMounted(() => {
  isMounted.value = true;
  /**
   * `formatQueue` falls back to the queue list for ids the local table does not know, but this page
   * never populated it: only `/` and `/summoner/[id]` call `fetchQueues`, which is why a direct
   * landing here showed a raw `Queue <id>` while `LolGameCard` — only ever rendered on those two
   * pages — resolved the same id. The label gates no blocking render, so it loads off the critical
   * path, and the store keeps the call to one per session.
   */
  lolStore.fetchQueues();
});

const isMvp = computed(
  () => match.value?.mvpParticipantId === heroPlayer.value?.id,
);
const isAce = computed(
  () => match.value?.aceParticipantId === heroPlayer.value?.id,
);
const isSyncing = ref(false);

useSeoMeta({
  title: computed(() =>
    heroPlayer.value
      ? `${heroPlayer.value.riotIdGameName || heroPlayer.value.championName} · Partie`
      : "Détail de la partie",
  ),
  description: computed(() =>
    heroPlayer.value
      ? `Détail de la partie de ${heroPlayer.value.riotIdGameName || heroPlayer.value.championName} sur JungleDiff : score, objectifs, film de la partie et statistiques avancées.`
      : "Détail de partie League of Legends sur JungleDiff.",
  ),
});

const mvpPuuid = computed(() => {
  if (!match.value) return undefined;
  if (match.value.mvpParticipantId != null) {
    return match.value.leagueOfLegendsGameParticipants.find(
      (p: LoLGameParticipantDto) => p.id === match.value!.mvpParticipantId,
    )?.puuid;
  }
  const winners = match.value.leagueOfLegendsGameParticipants.filter(
    (p: LoLGameParticipantDto) => p.teamId === match.value!.winningTeamId,
  );
  return bestParticipant(winners, (p: LoLGameParticipantDto) =>
    compositeScore(p, timeline.value || undefined),
  )?.player.puuid;
});

const acePuuid = computed(() => {
  if (!match.value) return undefined;
  if (match.value.aceParticipantId != null) {
    return match.value.leagueOfLegendsGameParticipants.find(
      (p: LoLGameParticipantDto) => p.id === match.value!.aceParticipantId,
    )?.puuid;
  }
  const losers = match.value.leagueOfLegendsGameParticipants.filter(
    (p: LoLGameParticipantDto) => p.teamId !== match.value!.winningTeamId,
  );
  return bestParticipant(losers, (p: LoLGameParticipantDto) =>
    compositeScore(p, timeline.value || undefined),
  )?.player.puuid;
});

const selectedPlayer = ref<LoLGameParticipantDto | undefined>(undefined);
watch(
  heroPlayer,
  (newVal) => {
    if (newVal && !selectedPlayer.value) {
      selectedPlayer.value = newVal;
    }
  },
  {immediate: true},
);

const onPlayerSelected = (playerOrPuuid: LoLGameParticipantDto | string) => {
  const player =
    typeof playerOrPuuid === "string"
      ? allPlayers.value.find(
          (p: LoLGameParticipantDto) => p.puuid === playerOrPuuid,
        )
      : playerOrPuuid;

  if (player) {
    selectedPlayer.value = player;
  }
};

/**
 * Re-reads the match and its timeline from the GameOn API. It does not ask the API to re-import the
 * game from Riot: the button reloads what the API already holds.
 */
const onSyncRequested = async () => {
  isSyncing.value = true;
  try {
    await Promise.all([refresh(), refreshTimeline()]);
  } finally {
    isSyncing.value = false;
  }
};

/** Back to the profile the page was opened from, or to the dashboard without one. */
const backLink = computed(() => {
  if (playerId == null || !Number.isFinite(playerId)) {
    return {to: "/", label: "Retour à l'accueil"};
  }
  const hero = heroPlayer.value;
  return {
    to: `/summoner/${playerId}`,
    // The Riot ID, which is the name the profile itself is titled with.
    label: hero ? `Profil de ${playerRiotName(hero)}` : "Retour au profil",
  };
});

/**
 * The coach analyses the player the page is built around, so its tab only exists when the route
 * carries a usable GameOn id: the API keys the report on `playerId` and answers 404 for anyone it
 * does not track.
 */
const coachPlayerId = computed(() =>
  playerId != null && Number.isFinite(playerId) ? playerId : null,
);

const tabs = computed(() => [
  {id: "overview", label: "Vue d'ensemble", icon: "lucide:layout-grid"},
  {id: "film", label: "Film de la partie", icon: "lucide:film"},
  {id: "performance", label: "Performance", icon: "lucide:chart-no-axes-column"},
  ...(coachPlayerId.value != null
    ? [{id: "rAImmus", label: "rAImmus", icon: "lucide:sparkles"}]
    : []),
  {id: "raw", label: "Données brutes", icon: "lucide:table"},
]);
const activeTabId = ref("overview");

const currentFrameIndex = ref(0);
const playProgress = ref(0);

watch(
  timeline,
  (newVal) => {
    if (newVal) {
      currentFrameIndex.value = Math.max(0, newVal.length - 1);
    }
  },
  {immediate: true},
);
</script>

<template>
  <div class="w-full">
    <NuxtLink
      :to="backLink.to"
      class="mb-4 inline-flex h-[30px] items-center gap-2 rounded-full border border-border-base bg-surface-base pl-2.5 pr-3 text-[12.5px] font-bold transition-[border-color,translate] duration-[250ms] ease-spring hover:-translate-x-0.5 hover:border-border-accent">
      <Icon name="lucide:arrow-left" class="size-[13px]" />
      {{ backLink.label }}
    </NuxtLink>

    <!-- Only before the first answer: a sync re-reads the match and must not blank the page. -->
    <div
      v-if="!match && status === 'pending'"
      aria-busy="true"
      class="flex flex-col items-center gap-4 px-6 py-[110px]">
      <img
        src="~/assets/img/JungleDiff_Logo.png"
        alt=""
        class="size-[72px] animate-bob object-contain" >
      <span
        class="inline-flex items-center gap-[9px] text-sm font-bold text-text-sec">
        <Icon
          name="lucide:refresh-cw"
          class="size-[15px] animate-spin text-win" />
        Chargement de la partie…
      </span>
    </div>

    <div
      v-else-if="!match"
      role="alert"
      class="flex flex-wrap items-center gap-5 rounded-[26px] border border-brand-red/30 bg-surface-base p-[26px] shadow-card">
      <img
        src="~/assets/img/JungleDiff_Logo.png"
        alt=""
        class="size-20 object-contain grayscale-[0.4]" >
      <div class="min-w-60 flex-1">
        <h2 class="m-0 text-[26px] font-bold tracking-[-0.03em]">
          Partie indisponible.
        </h2>
        <p
          class="m-0 mt-1.5 text-pretty text-[14.5px] leading-normal text-text-sec">
          L'API GameOn n'a pas pu charger le détail de cette partie. Réessayez
          dans un instant.
        </p>
      </div>
      <button
        type="button"
        :disabled="status === 'pending'"
        class="inline-flex h-[46px] cursor-pointer items-center gap-[9px] rounded-full bg-inverse px-[22px] text-[15px] font-bold text-inverse-text transition-transform duration-[250ms] ease-spring hover:scale-105 disabled:cursor-wait"
        @click="refresh()">
        <Icon
          name="lucide:refresh-cw"
          class="size-[15px]"
          :class="{'animate-spin': status === 'pending'}" />
        Réessayer
      </button>
    </div>

    <template v-else>
      <LolGameHeader
        :game="match"
        :hero-player="heroPlayer"
        :team1="team1"
        :team2="team2"
        :timeline="timeline || undefined"
        :patch="patch"
        :queue-label="queueLabel"
        :is-mvp="isMvp"
        :is-ace="isAce"
        :is-syncing="isSyncing"
        @sync-requested="onSyncRequested" />

      <LolGameObjectives
        class="mt-4"
        :game="match"
        :team1="team1"
        :team2="team2"
        :timeline="timeline || undefined" />

      <LolGameKeyMoments
        class="mt-4"
        :players="allPlayers"
        :timeline="timeline || undefined"
        :winning-team-id="match.winningTeamId" />

      <LolGameTabs
        class="mb-3 mt-5 md:mb-[18px] md:mt-7"
        :tabs="tabs"
        :active-id="activeTabId"
        @update:active-id="activeTabId = $event" />

      <div>
        <div v-if="activeTabId === 'overview'" class="flex flex-col gap-4">
          <LolGameOverviewTab
            :game="match"
            :team1="team1"
            :team2="team2"
            :timeline="timeline || undefined"
            :patch="patch"
            :selected-player="selectedPlayer"
            :mvp-puuid="mvpPuuid"
            :ace-puuid="acePuuid"
            :me-player-id="mePlayerId"
            @player-selected="onPlayerSelected" />

          <section aria-labelledby="game-highlights" class="mt-5 md:mt-8">
            <h2
              id="game-highlights"
              class="m-0 text-[32px] font-bold tracking-[-0.035em]">
              Mentions spéciales
            </h2>
            <p class="m-0 mb-5 mt-1.5 text-sm font-semibold text-text-sec">
              Les petits records de cette partie, sur les
              {{ allPlayers.length }} joueurs
            </p>
            <LolGameHighlights
              :players="allPlayers"
              :timeline="timeline || undefined"
              :duration-seconds="durationSecondsFor(match)"
              :patch="patch"
              :me-player-id="mePlayerId" />
          </section>
        </div>

        <div v-else-if="activeTabId === 'film'">
          <div
            v-if="!timeline?.length"
            class="rounded-[22px] border-[1.5px] border-dashed border-border-dashed px-6 py-10 text-center text-sm font-bold text-text-sec">
            Timeline indisponible pour cette partie : pas de film à rejouer.
          </div>

          <div v-else class="flex flex-col gap-4">
            <section
              aria-labelledby="game-film"
              class="animate-rise overflow-hidden rounded-[26px] border border-border-subtle bg-surface-base shadow-card">
              <div
                class="flex flex-wrap items-end justify-between gap-x-5 gap-y-3 px-[22px] pt-[22px]">
                <div>
                  <h3
                    id="game-film"
                    class="m-0 text-xl font-bold tracking-[-0.025em]">
                    Le film de la partie
                  </h3>
                  <p
                    class="m-0 mt-[3px] text-[12.5px] font-semibold text-text-sec">
                    Mini-carte, course à l'or et événements — pilotés par la
                    même timeline
                  </p>
                </div>
                <div class="flex gap-3.5 text-[12.5px] font-bold">
                  <span class="flex items-center gap-1.5">
                    <span class="size-[9px] rounded-full bg-loss" />
                    Éliminations
                  </span>
                  <span class="flex items-center gap-1.5">
                    <span class="size-[9px] rounded-full bg-brand-gold-bright" />
                    Objectifs
                  </span>
                </div>
              </div>

              <LolGameEventTimeline
                v-model:current-frame-index="currentFrameIndex"
                :timeline="timeline"
                :players="allPlayers"
                @play-progress-change="playProgress = $event" />

              <div
                class="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] border-t-[1.5px] border-dashed border-border-dashed">
                <LolGameMinimap
                  :timeline="timeline"
                  :players="allPlayers"
                  :current-frame-index="currentFrameIndex"
                  :patch="patch" />
                <LolGameGoldRace
                  :timeline="timeline"
                  :team1="team1"
                  :team2="team2"
                  :patch="patch"
                  :current-frame-index="currentFrameIndex"
                  :play-progress="playProgress" />
              </div>
            </section>

            <div
              class="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start gap-4">
              <LolGameKillFeed
                :players="allPlayers"
                :timeline="timeline"
                :patch="patch"
                :current-frame-index="currentFrameIndex"
                @frame-selected="currentFrameIndex = $event" />

              <div class="flex flex-col gap-4">
                <LolGameGoldChart
                  :timeline="timeline"
                  :team1="team1"
                  :team2="team2"
                  :selected-player="selectedPlayer"
                  :current-frame-index="currentFrameIndex" />
                <!-- Hides itself whole when the timeline carries no champion stats. -->
                <LolGameStatChart
                  :timeline="timeline"
                  :selected-player="selectedPlayer"
                  :current-frame-index="currentFrameIndex" />
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="activeTabId === 'performance'"
          class="flex flex-col gap-4">
          <LolGamePlayerPicker
            :players="allPlayers"
            :selected-puuid="selectedPlayer?.puuid"
            :patch="patch"
            @update:selected-puuid="onPlayerSelected" />

          <LolGamePlayerPerformance
            :player="selectedPlayer"
            :players="allPlayers"
            :timeline="timeline || undefined"
            :patch="patch"
            :duration-seconds="durationSecondsFor(match)"
            :me-player-id="mePlayerId" />

          <div
            class="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-4">
            <LolGamePlayerRadar
              :player="selectedPlayer"
              :players="allPlayers"
              :timeline="timeline || undefined" />
            <LolGamePlayerDamageProfile
              :player="selectedPlayer"
              :players="allPlayers"
              :timeline="timeline || undefined" />
            <LolGamePlayerGold
              :player="selectedPlayer"
              :timeline="timeline || undefined" />
            <LolGameStatChart
              :timeline="timeline || undefined"
              :selected-player="selectedPlayer"
              :current-frame-index="timeline?.length ? timeline.length - 1 : 0"
              :show-playhead="false" />
          </div>

          <div
            class="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start gap-4">
            <LolGameDamageChart
              :players="allPlayers"
              :timeline="timeline || undefined"
              :patch="patch"
              :selected-puuid="selectedPlayer?.puuid"
              @update:selected-puuid="onPlayerSelected" />
            <LolGameRankingChart
              :players="allPlayers"
              :selected-puuid="selectedPlayer?.puuid"
              :patch="patch"
              @update:selected-puuid="onPlayerSelected" />
          </div>
        </div>

        <LolGameCoachReport
          v-else-if="activeTabId === 'rAImmus' && coachPlayerId != null"
          :match-id="matchId"
          :player-id="coachPlayerId" />

        <LolGameRawStatsTable
          v-else-if="activeTabId === 'raw'"
          :players="allPlayers"
          :patch="patch"
          :expanded-default="true"
          :me-player-id="mePlayerId" />
      </div>
    </template>
  </div>
</template>
