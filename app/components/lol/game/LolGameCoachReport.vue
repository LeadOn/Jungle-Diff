<script setup lang="ts">
import {computed, onBeforeUnmount, ref} from "vue";
import {useAsyncData} from "#app";
import type {LoLCoachQueueStatusDto, LoLCoachReportDto} from "~/lib/types";
import type {LoLCoachResponse} from "~/lib/api/GameOnClient";
import {isCoachQueued} from "~/lib/api/GameOnClient";
import {AppError, isAbortError} from "~/lib/types/error";
import {useGameOnLol} from "~/composables/useGameOnLol";
import {useAuthStore} from "~/stores/auth";
import {decimalLabel, formatDateTime} from "~/utils/lol-match";

/**
 * "rAImmus" — Rammus + AI — is the public name of the coach. It lives here, in the labels: the API
 * routes are neutral (`/lol/coach/...`) and the report text itself comes from the model, so nothing
 * of the persona leaks into a contract.
 *
 * `playerId` is the one from the route, never the player picked in the Performance tab: eight of
 * the ten participants have no GameOn `playerId` and the API would answer 404 for them.
 *
 * The API queues generations behind a single consumer instead of writing during the request, so
 * both routes answer immediately and the wait is watched from here: a `202` carries a queue slot,
 * which this component polls until the report lands.
 */
const props = defineProps<{
  matchId: string;
  playerId: number;
}>();

const gameOnApi = useGameOnLol();
const authStore = useAuthStore();

/** Fast enough to feel live, slow enough to stay negligible against a ~50 s generation. */
const POLL_INTERVAL_MS = 5000;

/**
 * Cancels whatever is in flight when the tab is left — a response landing in an unmounted component
 * is at best wasted, at worst a late write over newer state. A generation already queued keeps
 * running upstream, so the report is simply there on the next visit.
 */
const controller = new AbortController();

const statusCodeOf = (error: unknown): number => {
  if (error instanceof AppError) return error.statusCode;
  if (error && typeof error === "object" && "statusCode" in error) {
    const code = (error as {statusCode?: unknown}).statusCode;
    return typeof code === "number" ? code : 0;
  }
  return 0;
};

/** Set as soon as either route answers `202`; cleared the moment the report arrives. */
const queueStatus = ref<LoLCoachQueueStatusDto | null>(null);

/**
 * The server gave up on this analysis — five consecutive refusals from the model. It is only ever
 * set from a `404` seen *while polling*, which is the one place that 404 cannot mean "not asked
 * for yet": see `pollOnce`.
 */
const hasBeenAbandoned = ref(false);

let pollTimer: ReturnType<typeof setInterval> | null = null;

const stopPolling = () => {
  if (pollTimer === null) return;
  clearInterval(pollTimer);
  pollTimer = null;
};

/**
 * An interval outliving the component would keep polling the API for a view nobody is looking at,
 * so it is cleared alongside the in-flight request rather than left to the garbage collector.
 */
onBeforeUnmount(() => {
  stopPolling();
  controller.abort();
});

const {
  data: report,
  status,
  error: loadError,
  refresh,
} = useAsyncData<LoLCoachReportDto | null>(
  `coach-${props.matchId}-${props.playerId}`,
  async () => {
    try {
      const response = await gameOnApi.getCoachReport(
        props.matchId,
        props.playerId,
        controller.signal,
      );

      if (isCoachQueued(response)) {
        queueStatus.value = response;
        startPolling();
        return null;
      }

      queueStatus.value = null;
      return response;
    } catch (error: unknown) {
      /**
       * A 404 on the *first* read is the nominal answer, not a failure: it means nobody has asked
       * for this analysis yet, which is exactly the state that offers the button. Left unmapped,
       * `useAsyncData` would park it in `error` and the tab would read as broken.
       */
      if (statusCodeOf(error) === 404) return null;
      console.error("[coach] Report read failed:", error);
      throw error;
    }
  },
  {lazy: true},
);

/** One poll tick: the same `GET`, read for the three answers it can now give. */
const pollOnce = async () => {
  try {
    const response = await gameOnApi.getCoachReport(
      props.matchId,
      props.playerId,
      controller.signal,
    );

    // Still waiting. The estimate is recomputed server-side from the last ten real generations, so
    // it is re-read on every tick rather than held at the value the first answer carried.
    if (isCoachQueued(response)) {
      queueStatus.value = response;
      return;
    }

    stopPolling();
    queueStatus.value = null;
    report.value = response;
  } catch (error: unknown) {
    if (isAbortError(error)) return;

    /**
     * A 404 *here* is not the initial one. The slot existed a few seconds ago, so the API dropping
     * it means the generation was abandoned. Falling back to the "nobody asked yet" screen would
     * make that failure indistinguishable from the starting state, and the player would sit there
     * re-clicking a button that can only fail again.
     */
    if (statusCodeOf(error) === 404) {
      stopPolling();
      queueStatus.value = null;
      hasBeenAbandoned.value = true;
      return;
    }

    // Anything else is treated as transient: the queue is still upstream and the next tick retries,
    // which beats tearing down a two-minute wait over one failed round trip.
    console.error("[coach] Queue poll failed:", error);
  }
};

const startPolling = () => {
  // Never on the server: an interval started during SSR has nothing left to update and would keep
  // a handle alive in a render that is already serialized.
  if (!import.meta.client || pollTimer !== null) return;
  pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS);
};

const isSubmitting = ref(false);
const generationError = ref<unknown>(null);

const isLoading = computed(() => status.value === "pending");

/** Applies a `POST` answer: the report if it was already in cache, a queue slot otherwise. */
const applyQueuedOrReport = (response: LoLCoachResponse) => {
  if (isCoachQueued(response)) {
    queueStatus.value = response;
    startPolling();
    return;
  }

  queueStatus.value = null;
  report.value = response;
};

const requestAnalysis = async () => {
  if (isSubmitting.value) return;

  isSubmitting.value = true;
  generationError.value = null;
  hasBeenAbandoned.value = false;

  try {
    // Returns immediately now: the API either hands back a cached report or takes the slot. Two
    // clicks do not buy two slots — it deduplicates on `(matchId, playerId)`.
    applyQueuedOrReport(
      await gameOnApi.generateCoachReport(
        props.matchId,
        props.playerId,
        controller.signal,
      ),
    );
  } catch (error: unknown) {
    if (isAbortError(error)) return;
    console.error("[coach] Analysis request failed:", error);
    generationError.value = error;
  } finally {
    isSubmitting.value = false;
  }
};

const retry = () => {
  generationError.value = null;
  hasBeenAbandoned.value = false;
  return refresh();
};

/**
 * Failures are dressed in the character rather than in HTTP terms.
 *
 * Model saturation no longer reaches the browser: the queue absorbs it through its own retries, and
 * a failed generation surfaces as an abandoned slot (`hasBeenAbandoned`), not as a status code. A
 * 5xx on these routes is therefore a genuine defect again, and is worded as one.
 */
const errorCopy = computed(() => {
  const error = generationError.value ?? loadError.value;
  if (!error) return null;

  const code = statusCodeOf(error);

  if (code === 401 || code === 403) {
    return {
      quote: "OK.",
      title: "rAImmus ne vous reconnaît pas.",
      message:
        "Votre session a sans doute expiré. Reconnectez-vous et redemandez-lui.",
    };
  }

  if (code === 0 || code >= 500) {
    return {
      quote: "OK.",
      title: "rAImmus a calé.",
      message:
        "Sa file d'attente n'a pas répondu — ça, ce n'est pas normal. Réessayez dans un instant ; si ça recommence, c'est un bug de notre côté.",
    };
  }

  /**
   * A 404 can only come from the generation here: the initial read maps its own onto `null`, and a
   * 404 seen while polling lands in `hasBeenAbandoned`. The API answers it when it does not know
   * the match, or when that player did not play it.
   */
  if (code === 404) {
    return {
      quote: "OK.",
      title: "rAImmus ne trouve pas cette partie.",
      message:
        "Elle n'est pas dans ses archives, ou ce joueur n'y a pas pris part.",
    };
  }

  // The raw message stays in the console: it names an endpoint and a status, which belongs in a log
  // rather than in a French interface.
  return {
    quote: "OK.",
    title: "rAImmus n'a pas rendu sa copie.",
    message:
      "Quelque chose s'est mal passé de son côté. Réessayez dans un instant.",
  };
});

/**
 * Position 1 is not "first in line", it is the one being written: saying so is more informative
 * than a rank, and it is the only position the player cannot shorten by waiting.
 */
const queueTitle = computed(() => {
  const position = queueStatus.value?.position ?? 0;
  if (position <= 1) return "rAImmus analyse votre partie.";
  return `${position}ᵉ dans la file.`;
});

/**
 * Below ~90 s the seconds say something a minute count cannot: "~40 s" is a wait you sit through,
 * "~1 min" is not. Above it, minutes read better than a three-digit second count. Values are
 * rounded to 5 s steps so a moving server-side estimate does not flicker digit by digit.
 */
const formatWait = (seconds: number): string => {
  if (seconds < 90) return `~${Math.max(5, Math.round(seconds / 5) * 5)} s`;
  return `~${Math.round(seconds / 60)} min`;
};

const waitLabel = computed(() =>
  queueStatus.value ? formatWait(queueStatus.value.estimatedWaitSeconds) : "",
);

/** Context for the estimate: it is long because others are ahead, not because it is slow. */
const queueLengthLabel = computed(() => {
  const length = queueStatus.value?.queueLength ?? 0;
  if (length <= 1) return "Il n'a que celle-ci sur le feu.";
  return `${length} analyses sur le feu, celle en cours comprise.`;
});

const noteLabel = computed(() =>
  report.value ? decimalLabel(report.value.analysis.noteSur10, 1) : "",
);
const generatedOnLabel = computed(() =>
  report.value ? formatDateTime(report.value.generatedOn) : "",
);
</script>

<template>
  <section
    class="rounded-2xl bg-surface-base border border-border-base shadow-sm">
    <header
      class="border-border-base flex flex-wrap items-center gap-3 border-b px-5 py-4">
      <!-- The site's own mascot: Rammus throwing the OK sign, which is exactly the coach's register. -->
      <div
        class="bg-surface-high border-border-subtle flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border">
        <img
          src="~/assets/img/JungleDiff_Logo.png"
          alt="rAImmus"
          class="h-8 w-8 object-contain" />
      </div>

      <div class="min-w-[12rem] flex-1">
        <p class="font-heading text-text-main text-base font-semibold">
          rAImmus
        </p>
        <p class="text-text-ter mt-0.5 text-[13px]">
          Le coach IA de JungleDiff &middot; il regarde la partie et dit ce
          qu'il en pense
        </p>
      </div>

      <span
        class="border-border-base text-text-ter inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-white/5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest light:bg-black/5">
        <Icon name="lucide:sparkles" class="h-3 w-3" />
        Généré par IA
      </span>
    </header>

    <!--
      Waiting its turn. The API writes reports on a single consumer, one at a time, so this is the
      whole point of the queue: telling the player where they stand instead of showing an opaque
      spinner for two minutes. Position and estimate are re-read on every poll.
    -->
    <div
      v-if="queueStatus"
      class="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <Icon name="lucide:brain" class="text-brand-gold h-8 w-8 animate-pulse" />

      <p class="text-text-main m-0 text-sm font-semibold">
        {{ queueTitle }}
      </p>

      <p class="text-text-ter m-0 max-w-md text-[13px] leading-relaxed">
        Il prend les demandes une par une. {{ queueLengthLabel }}
      </p>

      <span
        class="border-brand-gold/45 bg-brand-gold/15 text-brand-gold inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold">
        <Icon name="lucide:hourglass" class="h-4 w-4" />
        Encore {{ waitLabel }}
      </span>

      <p class="text-text-ter m-0 text-xs">
        Cette page se met à jour toute seule — inutile de recliquer.
      </p>
    </div>

    <div v-else-if="isLoading" class="py-10">
      <UiLoadingSpinner size="md" />
    </div>

    <template v-else-if="report">
      <!-- A failed regeneration must not hide the report already on screen. -->
      <div
        v-if="errorCopy"
        class="border-brand-red/20 bg-brand-red/10 text-text-sec mx-5 mt-5 flex items-start gap-2 rounded-xl border px-4 py-3 text-[13px]">
        <Icon
          name="lucide:triangle-alert"
          class="text-brand-red mt-0.5 h-4 w-4 shrink-0" />
        <span>{{ errorCopy.message }}</span>
      </div>

      <div class="space-y-6 p-5">
        <div class="flex flex-wrap items-center gap-3">
          <!--
            Explicitly labelled as rAImmus' own mark: the note in the page header comes from
            `LoLGameParticipantStat.Rating`, which is computed and reproducible, while this one is
            editorial and can land several points away on the very same game.
          -->
          <span
            class="border-brand-gold/45 bg-brand-gold/15 text-brand-gold inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold">
            <Icon name="lucide:message-square-quote" class="h-4 w-4" />
            L'avis de rAImmus : {{ noteLabel }}/10
          </span>
          <span class="text-text-ter text-xs">
            Note éditoriale, indépendante de la note calculée affichée en haut
            de la page.
          </span>
        </div>

        <div>
          <h3 class="text-text-main m-0 mb-2 text-sm font-extrabold">
            Synthèse
          </h3>
          <p class="text-text-sec m-0 text-sm leading-relaxed">
            {{ report.analysis.synthese }}
          </p>
        </div>

        <div>
          <h3 class="text-text-main m-0 mb-2 text-sm font-extrabold">
            Points forts
          </h3>

          <!-- An empty list is a deliberate API answer: the coach never invents a compliment. -->
          <p
            v-if="report.analysis.pointsForts.length === 0"
            class="text-text-ter m-0 text-sm leading-relaxed">
            rAImmus n'a rien trouvé à sauver sur cette partie. « OK. » Ça
            arrive.
          </p>

          <ul v-else class="m-0 flex list-none flex-col gap-2 p-0">
            <li
              v-for="(point, index) in report.analysis.pointsForts"
              :key="index"
              class="text-text-sec flex items-start gap-2 text-sm leading-relaxed">
              <Icon
                name="lucide:check"
                class="text-brand-green mt-0.5 h-4 w-4 shrink-0" />
              <span>{{ point }}</span>
            </li>
          </ul>
        </div>

        <div v-if="report.analysis.axesProgression.length > 0">
          <h3 class="text-text-main m-0 mb-2 text-sm font-extrabold">
            Axes de progression
          </h3>

          <div class="flex flex-col gap-3">
            <article
              v-for="(axis, index) in report.analysis.axesProgression"
              :key="index"
              class="border-border-subtle bg-surface-high rounded-xl border p-4">
              <h4
                class="text-text-main m-0 flex items-start gap-2 text-[13px] font-extrabold">
                <Icon
                  name="lucide:target"
                  class="text-brand-gold mt-0.5 h-4 w-4 shrink-0" />
                <span>{{ axis.titre }}</span>
              </h4>
              <p class="text-text-sec m-0 mt-2 text-sm leading-relaxed">
                {{ axis.explication }}
              </p>
              <p
                class="text-text-main border-border-subtle m-0 mt-3 flex items-start gap-2 border-t pt-3 text-[13px] font-semibold">
                <Icon
                  name="lucide:arrow-right"
                  class="text-brand-green mt-0.5 h-4 w-4 shrink-0" />
                <span>{{ axis.actionConcrete }}</span>
              </p>
            </article>
          </div>
        </div>

        <footer
          class="border-border-subtle flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p class="text-text-ter m-0 text-xs">
            Écrit le {{ generatedOnLabel
            }}<template v-if="report.modelName">
              par {{ report.modelName }}</template
            >. Analyse générée par une IA : elle peut se tromper.
          </p>

          <!--
            The API returns the stored report instead of paying for a second generation, so this
            reloads rather than rewrites — the label says so, to avoid promising a new opinion.
          -->
          <button
            v-if="authStore.isAuthenticated"
            type="button"
            class="text-text-ter hover:text-text-main border-border-base inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            title="rAImmus ne réécrit pas : il ressort l'analyse déjà enregistrée."
            :disabled="isLoading"
            @click="retry">
            <Icon name="lucide:rotate-cw" class="h-3.5 w-3.5" />
            Recharger l'analyse
          </button>
        </footer>
      </div>
    </template>

    <!--
      The slot existed a moment ago and the API dropped it: the model refused five times in a row
      and the generation was abandoned. Rendering the "nobody asked yet" screen below would make
      this indistinguishable from the starting state, so it gets its own wording — and its own
      button, because re-asking is the right move here, just not immediately.
    -->
    <div
      v-else-if="hasBeenAbandoned"
      class="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <p class="font-heading text-text-main m-0 text-xl font-bold">« OK. »</p>
      <p class="text-text-main m-0 text-sm font-semibold">
        rAImmus n'a pas réussi à analyser cette partie.
      </p>
      <p class="text-text-ter m-0 max-w-md text-[13px] leading-relaxed">
        Il a tourné autour un moment, puis il a lâché l'affaire. Ça arrive sur
        les parties qui sortent de l'ordinaire — redemandez-lui plus tard.
      </p>

      <button
        v-if="authStore.isAuthenticated"
        type="button"
        class="bg-brand-gold text-brand-gold-text mt-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isSubmitting"
        @click="requestAnalysis">
        <Icon name="lucide:rotate-cw" class="h-4 w-4" />
        Redemander l'analyse
      </button>
    </div>

    <div
      v-else-if="errorCopy"
      class="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <p class="font-heading text-text-main m-0 text-xl font-bold">
        « {{ errorCopy.quote }} »
      </p>
      <p class="text-text-main m-0 text-sm font-semibold">
        {{ errorCopy.title }}
      </p>
      <p class="text-text-ter m-0 max-w-md text-[13px]">
        {{ errorCopy.message }}
      </p>

      <button
        type="button"
        class="bg-brand-gold text-brand-gold-text mt-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90"
        @click="retry">
        <Icon name="lucide:rotate-cw" class="h-4 w-4" />
        Réessayer
      </button>
    </div>

    <!-- Nothing stored yet: the 404 above lands here, and this is the only state offering the button. -->
    <div v-else class="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <img
        src="~/assets/img/JungleDiff_Logo.png"
        alt=""
        aria-hidden="true"
        class="h-20 w-20 object-contain opacity-80" />

      <p class="text-text-main m-0 text-sm font-semibold">
        rAImmus n'a pas encore vu cette partie.
      </p>
      <p class="text-text-ter m-0 max-w-md text-[13px] leading-relaxed">
        Il veut bien s'en occuper : une synthèse, ce qui a marché, et ce qu'il y
        a à travailler. Il traite les demandes une par une — vous verrez votre
        place dans sa file.
      </p>

      <button
        v-if="authStore.isAuthenticated"
        type="button"
        class="bg-brand-gold text-brand-gold-text mt-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="isSubmitting"
        @click="requestAnalysis">
        <Icon name="lucide:brain" class="h-4 w-4" />
        Demander l'analyse
      </button>

      <template v-else>
        <p class="text-text-ter m-0 text-[13px]">
          Connectez-vous pour lui demander son avis.
        </p>
        <button
          type="button"
          class="border-border-base text-text-main inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors hover:bg-white/10 light:hover:bg-black/5"
          @click="authStore.login()">
          <Icon name="lucide:log-in" class="h-4 w-4" />
          Se connecter
        </button>
      </template>
    </div>
  </section>
</template>
