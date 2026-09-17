<script setup lang="ts">
import {computed, onBeforeUnmount, ref} from "vue";
import {useAsyncData} from "#app";
import type {LoLCoachReportDto} from "~/lib/types";
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
 */
const props = defineProps<{
  matchId: string;
  playerId: number;
}>();

const gameOnApi = useGameOnLol();
const authStore = useAuthStore();

/**
 * Cancels whatever is in flight when the tab is left — a response landing in an unmounted component
 * is at best wasted, at worst a late write over newer state. A generation already started keeps
 * running upstream, so the report is simply there on the next visit.
 */
const controller = new AbortController();
onBeforeUnmount(() => controller.abort());

const statusCodeOf = (error: unknown): number => {
  if (error instanceof AppError) return error.statusCode;
  if (error && typeof error === "object" && "statusCode" in error) {
    const code = (error as {statusCode?: unknown}).statusCode;
    return typeof code === "number" ? code : 0;
  }
  return 0;
};

const {
  data: report,
  status,
  error: loadError,
  refresh,
} = useAsyncData<LoLCoachReportDto | null>(
  `coach-${props.matchId}-${props.playerId}`,
  async () => {
    try {
      return await gameOnApi.getCoachReport(
        props.matchId,
        props.playerId,
        controller.signal,
      );
    } catch (error: unknown) {
      /**
       * A 404 is the nominal answer, not a failure: it means nobody has asked for this analysis
       * yet, which is exactly the state that offers the button. Left unmapped, `useAsyncData` would
       * park it in `error` and the tab would read as broken.
       */
      if (statusCodeOf(error) === 404) return null;
      console.error("[coach] Report read failed:", error);
      throw error;
    }
  },
  {lazy: true},
);

const isGenerating = ref(false);
const generationError = ref<unknown>(null);

const isLoading = computed(() => status.value === "pending");

const requestAnalysis = async () => {
  if (isGenerating.value) return;

  isGenerating.value = true;
  generationError.value = null;

  try {
    // Strictly client-side and deliberately slow: the model writes while the request is held open.
    report.value = await gameOnApi.generateCoachReport(
      props.matchId,
      props.playerId,
      controller.signal,
    );
  } catch (error: unknown) {
    if (isAbortError(error)) return;
    console.error("[coach] Analysis generation failed:", error);
    generationError.value = error;
  } finally {
    isGenerating.value = false;
  }
};

const retry = () => {
  generationError.value = null;
  return refresh();
};

/**
 * Failures are dressed in the character rather than in HTTP terms. A 500 from this endpoint almost
 * always means the model is saturated, which is a "come back in a minute", not a bug the user could
 * do anything about.
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
        "Trop de monde lui demande son avis en même temps. Laissez-le rouler tranquille une minute, puis réessayez.",
    };
  }

  /**
   * A 404 can only come from the generation here: the read maps its own onto `null` above. The API
   * answers it when it does not know the match, or when that player did not play it.
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

    <!-- Generation in progress: the model writes while the request is held open, ~15 s. -->
    <div
      v-if="isGenerating"
      class="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <Icon name="lucide:brain" class="text-brand-gold h-8 w-8 animate-pulse" />
      <p class="text-text-main text-sm font-semibold">
        rAImmus regarde la partie…
      </p>
      <p class="text-text-ter max-w-md text-[13px]">
        Il repasse les moments clés, puis il écrit. Comptez une quinzaine de
        secondes — inutile de recliquer.
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
        a à travailler. Il lui faut une quinzaine de secondes pour dérouler.
      </p>

      <button
        v-if="authStore.isAuthenticated"
        type="button"
        class="bg-brand-gold text-brand-gold-text mt-1 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-opacity hover:opacity-90"
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
