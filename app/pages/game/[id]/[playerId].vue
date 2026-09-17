<script setup lang="ts">
import {ref, computed, onMounted, watch} from "vue";
import type {LoLGameParticipantDto} from "~/lib/types/match";
import {useRoute, useAsyncData} from "#app";
import {useGameOnLol} from "~/composables/useGameOnLol";
import {formatQueue} from "~/lib/utils/lol";
import {useLolStore} from "~/stores/lol";

import LolGameHeader from "~/components/lol/game/LolGameHeader.vue";
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
} from "~/utils/lol-match";

const route = useRoute();
const gameOnApi = useGameOnLol();
const lolStore = useLolStore();

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
const {data: timeline} = await useAsyncData(`timeline-${matchId}`, () =>
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

onMounted(() => {
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

const onSyncRequested = async () => {
  isSyncing.value = true;
  await refresh();
  isSyncing.value = false;
};

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
  {id: "performance", label: "Performance", icon: "lucide:bar-chart-2"},
  ...(coachPlayerId.value != null
    ? [{id: "rAImmus", label: "rAImmus", icon: "lucide:brain"}]
    : []),
  {id: "raw", label: "Données brutes", icon: "lucide:table-properties"},
]);
const activeTabId = ref("overview");

const damageMode = ref<"dealt" | "taken">("dealt");
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
  <div class="max-w-[1200px] mx-auto p-4 sm:p-6 pb-20">
    <div class="mb-4">
      <NuxtLink
        :to="playerId ? `/summoner/${playerId}` : '/'"
        class="text-text-ter hover:text-text-main inline-flex items-center gap-1 transition-colors text-sm font-medium">
        <Icon name="lucide:arrow-left" class="w-4 h-4" /> Retour
      </NuxtLink>
    </div>

    <div v-if="status === 'pending'">
      <UiLoadingSpinner size="lg" />
    </div>

    <div v-else-if="status === 'error' || error">
      <UiErrorState
        :message="error?.message || 'Failed to load match details'"
        :retry="refresh" />
    </div>

    <div v-else-if="match" class="space-y-6">
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

      <div class="mt-3">
        <LolGameKeyMoments
          :players="allPlayers"
          :timeline="timeline || undefined"
          :winning-team-id="match.winningTeamId" />
      </div>

      <div class="flex justify-center mt-6">
        <LolGameTabs
          :tabs="tabs"
          :active-id="activeTabId"
          @update:active-id="activeTabId = $event" />
      </div>

      <div class="mt-6">
        <div v-if="activeTabId === 'overview'">
          <LolGameOverviewTab
            :game="match"
            :team1="team1"
            :team2="team2"
            :timeline="timeline || undefined"
            :patch="patch"
            :selected-player="selectedPlayer"
            :mvp-puuid="mvpPuuid"
            :ace-puuid="acePuuid"
            @player-selected="onPlayerSelected" />

          <div
            class="mt-4 rounded-2xl bg-surface-base border border-border-base shadow-sm">
            <div class="border-border-base border-b px-5 py-4">
              <p class="font-heading text-text-main text-base font-semibold">
                Mentions spéciales
              </p>
            </div>
            <LolGameHighlights
              :players="allPlayers"
              :timeline="timeline || undefined"
              :duration-seconds="durationSecondsFor(match)"
              :patch="patch" />
          </div>
        </div>

        <div v-else-if="activeTabId === 'film'">
          <div
            class="rounded-2xl bg-surface-base border border-border-base shadow-sm">
            <div
              class="border-border-base flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <div>
                <p class="font-heading text-text-main text-base font-semibold">
                  Le film de la partie
                </p>
                <p class="text-text-ter mt-0.5 text-[13px]">
                  Mini-carte, course à l'or et événements — pilotés par la même
                  timeline
                </p>
              </div>

              <div class="text-text-ter flex items-center gap-4 text-xs">
                <span class="flex items-center gap-1.5">
                  <span class="bg-brand-red h-2 w-2 rounded-full" />
                  Éliminations
                </span>
                <span class="flex items-center gap-1.5">
                  <span class="bg-brand-gold h-2 w-2 rounded-full" />
                  Objectifs
                </span>
              </div>
            </div>

            <LolGameEventTimeline
              v-model:current-frame-index="currentFrameIndex"
              :timeline="timeline || undefined"
              :players="allPlayers"
              @play-progress-change="playProgress = $event" />

            <div
              class="border-border-base grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] border-t">
              <LolGameMinimap
                :timeline="timeline || undefined"
                :players="allPlayers"
                :current-frame-index="currentFrameIndex"
                :patch="patch" />

              <LolGameGoldRace
                :timeline="timeline || undefined"
                :team1="team1"
                :team2="team2"
                :patch="patch"
                :current-frame-index="currentFrameIndex"
                :play-progress="playProgress" />
            </div>
          </div>

          <div
            class="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] items-start gap-4 mt-4">
            <div
              class="rounded-2xl bg-surface-base border border-border-base shadow-sm">
              <div class="border-border-base border-b px-5 py-4">
                <p class="font-heading text-text-main text-base font-semibold">
                  Kill feed
                </p>
                <p class="text-text-ter mt-0.5 text-[13px]">
                  Cliquez un événement pour y déplacer le film
                </p>
              </div>

              <LolGameKillFeed
                :players="allPlayers"
                :timeline="timeline || undefined"
                :patch="patch"
                @frame-selected="currentFrameIndex = $event" />
            </div>

            <div class="flex flex-col gap-4">
              <div
                class="rounded-2xl bg-surface-base border border-border-base shadow-sm">
                <LolGameGoldChart
                  :timeline="timeline || undefined"
                  :team1="team1"
                  :team2="team2"
                  :selected-player="selectedPlayer"
                  :current-frame-index="currentFrameIndex" />
              </div>

              <!-- Carries its own card chrome: it hides itself whole when the timeline has no
                   champion stats, and an empty bordered box would remain otherwise. -->
              <LolGameStatChart
                :timeline="timeline || undefined"
                :selected-player="selectedPlayer"
                :current-frame-index="currentFrameIndex" />
            </div>
          </div>
        </div>

        <div v-else-if="activeTabId === 'performance'">
          <LolGamePlayerPicker
            :players="allPlayers"
            :selected-puuid="selectedPlayer?.puuid"
            :patch="patch"
            @update:selected-puuid="onPlayerSelected" />

          <div class="mt-4">
            <LolGamePlayerPerformance
              :player="selectedPlayer"
              :players="allPlayers"
              :timeline="timeline || undefined"
              :patch="patch"
              :duration-seconds="durationSecondsFor(match)" />
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div
              class="rounded-2xl bg-surface-base border border-border-base shadow-sm">
              <LolGamePlayerRadar
                :player="selectedPlayer"
                :players="allPlayers"
                :timeline="timeline || undefined" />
            </div>

            <div
              class="rounded-2xl bg-surface-base border border-border-base shadow-sm">
              <LolGamePlayerDamageProfile
                :player="selectedPlayer"
                :players="allPlayers"
                :timeline="timeline || undefined" />
            </div>

            <div
              class="rounded-2xl bg-surface-base border border-border-base shadow-sm">
              <LolGamePlayerGold
                :player="selectedPlayer"
                :timeline="timeline || undefined" />
            </div>

            <div
              class="rounded-2xl bg-surface-base border border-border-base shadow-sm">
              <LolGameStatChart
                :timeline="timeline || undefined"
                :selected-player="selectedPlayer"
                :current-frame-index="
                  timeline?.length ? timeline.length - 1 : 0
                " />
            </div>
          </div>

          <div
            class="mt-4 rounded-2xl bg-surface-base border border-border-base shadow-sm">
            <div
              class="border-border-base flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <p class="font-heading text-text-main text-base font-semibold">
                Dégâts aux champions
              </p>

              <div
                class="border-border-base inline-flex items-center gap-1 rounded-full border p-1">
                <button
                  type="button"
                  class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                  :class="
                    damageMode === 'dealt'
                      ? 'text-text-main bg-white/10 light:bg-black/10'
                      : 'text-text-ter hover:text-text-main hover:bg-white/5 light:hover:bg-black/5'
                  "
                  @click="damageMode = 'dealt'">
                  Infligés
                </button>
                <button
                  type="button"
                  class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                  :class="
                    damageMode === 'taken'
                      ? 'text-text-main bg-white/10 light:bg-black/10'
                      : 'text-text-ter hover:text-text-main hover:bg-white/5 light:hover:bg-black/5'
                  "
                  @click="damageMode = 'taken'">
                  Subis
                </button>
              </div>
            </div>

            <LolGameDamageChart
              :players="allPlayers"
              :timeline="timeline || undefined"
              :patch="patch"
              :mode="damageMode"
              :selected-puuid="selectedPlayer?.puuid"
              @update:selected-puuid="onPlayerSelected" />
          </div>

          <div
            class="mt-4 rounded-2xl bg-surface-base border border-border-base shadow-sm">
            <div class="border-border-base border-b px-5 py-4">
              <p class="font-heading text-text-main text-base font-semibold">
                Comparaison des joueurs
              </p>
              <p class="text-text-ter mt-0.5 text-[13px]">
                Classement des 10 joueurs sur une statistique &middot; cliquez
                un joueur pour le mettre en avant
              </p>
            </div>

            <LolGameRankingChart
              :players="allPlayers"
              :selected-puuid="selectedPlayer?.puuid"
              :patch="patch"
              @update:selected-puuid="onPlayerSelected" />
          </div>
        </div>

        <div v-else-if="activeTabId === 'rAImmus' && coachPlayerId != null">
          <LolGameCoachReport :match-id="matchId" :player-id="coachPlayerId" />
        </div>

        <div v-else-if="activeTabId === 'raw'">
          <div
            class="rounded-2xl bg-surface-base border border-border-base shadow-sm">
            <LolGameRawStatsTable
              :players="allPlayers"
              :patch="patch"
              :expanded-default="true" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
