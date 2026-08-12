<script setup lang="ts">
import {ref, computed} from "vue";
import type {LeagueOfLegendsRank} from "~/lib/types";
import {rankScore, tierLabel} from "~/utils/lol-tier";

type Queue = "solo" | "flex";

const props = defineProps<{
  soloEntries: LeagueOfLegendsRank[];
  flexEntries: LeagueOfLegendsRank[];
  period: "7j" | "30j" | "saison";
  loading?: boolean;
}>();

const PERIOD_CAPTION: Record<string, string> = {
  "7j": "7 JOURS",
  "30j": "30 JOURS",
  saison: "Depuis toujours",
};

// L'utilisateur peut choisir sa file manuellement ; tant qu'il ne l'a pas fait,
// on retombe sur la première file qui a des données (Solo/Duo en priorité).
const userSelectedQueue = ref<Queue | null>(null);
const selectedQueue = computed<Queue>(
  () =>
    userSelectedQueue.value ?? (props.soloEntries.length > 0 ? "solo" : "flex"),
);
const selectQueue = (q: Queue) => {
  userSelectedQueue.value = q;
};

const entries = computed(() =>
  selectedQueue.value === "solo" ? props.soloEntries : props.flexEntries,
);

const sorted = computed(() =>
  [...entries.value].sort(
    (a, b) => new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime(),
  ),
);

const hasEnoughData = computed(() => sorted.value.length >= 2);

const points = computed(() => {
  const scores = sorted.value.map(rankScore);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min || 1;
  return scores.map((v, i) => ({
    x: Math.round((i / (scores.length - 1)) * 272 * 10) / 10,
    y: Math.round((88 - ((v - min) / span) * 80) * 10) / 10,
  }));
});

const linePath = computed(() =>
  points.value.map((p, i) => (i === 0 ? "M" : "L") + p.x + " " + p.y).join(" "),
);
const areaPath = computed(() =>
  points.value.length ? linePath.value + " L272 96 L0 96 Z" : "",
);

const netScore = computed(() => {
  const scores = sorted.value.map(rankScore);
  return (scores[scores.length - 1] ?? 0) - (scores[0] ?? 0);
});
const trendUp = computed(() => netScore.value >= 0);
const lineColor = computed(() =>
  trendUp.value ? "var(--color-green)" : "var(--color-red)",
);
const areaColor = computed(() =>
  trendUp.value ? "var(--color-win-wash)" : "var(--color-loss-wash)",
);

const lastPoint = computed(() => points.value[points.value.length - 1]);

const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {day: "numeric", month: "short"})
    .format(new Date(iso))
    .toUpperCase()
    .replace(".", "");
const formatLongDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));

const firstLabel = computed(() =>
  sorted.value[0] ? formatShortDate(sorted.value[0].createdOn) : "",
);
const nowLabel = computed(() => {
  const last = sorted.value[sorted.value.length - 1];
  return last ? `${tierLabel(last)} · ${last.leaguePoints} LP` : "";
});
const caption = computed(
  () => PERIOD_CAPTION[props.period] ?? PERIOD_CAPTION["30j"],
);

// Survol : retrouve le point le plus proche du curseur et affiche sa date + son LP
const svgEl = ref<SVGSVGElement | null>(null);
const hoveredIndex = ref<number | null>(null);
const hoveredPixelX = ref(0);
const chartWidth = ref(0);

const hoveredEntry = computed(() =>
  hoveredIndex.value != null ? sorted.value[hoveredIndex.value] : null,
);
const hoveredPoint = computed(() =>
  hoveredIndex.value != null ? points.value[hoveredIndex.value] : null,
);

// Évite que la tooltip ne déborde de la carte près des bords gauche/droite du graphe
const tooltipStyle = computed(() => {
  const edgeMargin = 56;
  let translateX = "-50%";
  if (hoveredPixelX.value < edgeMargin) translateX = "0%";
  else if (chartWidth.value - hoveredPixelX.value < edgeMargin)
    translateX = "-100%";
  return {
    left: `${hoveredPixelX.value}px`,
    top: "-4px",
    transform: `translate(${translateX}, -100%)`,
  };
});

function onSvgMouseMove(event: MouseEvent) {
  if (!svgEl.value || points.value.length === 0) return;
  const rect = svgEl.value.getBoundingClientRect();
  if (rect.width === 0) return;
  chartWidth.value = rect.width;
  const relX = event.clientX - rect.left;
  const vbX = (relX / rect.width) * 272;

  let nearest = 0;
  let nearestX = points.value[0]?.x ?? 0;
  let minDist = Infinity;
  points.value.forEach((p, i) => {
    const dist = Math.abs(p.x - vbX);
    if (dist < minDist) {
      minDist = dist;
      nearest = i;
      nearestX = p.x;
    }
  });
  hoveredIndex.value = nearest;
  hoveredPixelX.value = (nearestX / 272) * rect.width;
}

function onSvgMouseLeave() {
  hoveredIndex.value = null;
}
</script>

<template>
  <section class="rounded-2xl border border-border-base bg-surface-base p-6">
    <div class="flex items-center justify-between gap-3 mb-1">
      <h3 class="m-0 text-sm font-extrabold text-text-main">Progression LP</h3>
      <span
        v-if="hasEnoughData"
        class="text-sm font-black"
        :class="trendUp ? 'text-brand-green' : 'text-brand-red'">
        {{ trendUp ? "+" : "" }}{{ netScore }} pts
      </span>
    </div>

    <div class="flex items-center justify-between gap-2 mb-9">
      <p
        class="m-0 font-mono text-[9px] font-bold tracking-widest uppercase text-text-ter">
        {{ caption }}
      </p>
      <div
        class="flex p-0.5 rounded-full bg-surface-high border border-border-subtle shrink-0">
        <button
          type="button"
          class="px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors"
          :class="
            selectedQueue === 'solo'
              ? 'bg-surface-base shadow-sm text-text-main border border-border-accent'
              : 'text-text-sec hover:text-text-main'
          "
          @click="selectQueue('solo')">
          Solo/Duo
        </button>
        <button
          type="button"
          class="px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors"
          :class="
            selectedQueue === 'flex'
              ? 'bg-surface-base shadow-sm text-text-main border border-border-accent'
              : 'text-text-sec hover:text-text-main'
          "
          @click="selectQueue('flex')">
          Flex
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="h-24 w-full rounded-lg bg-surface-high animate-pulse" />
    <div
      v-else-if="!hasEnoughData"
      class="h-24 flex items-center justify-center text-center text-xs font-bold text-text-ter">
      Pas assez de relevés sur cette période.
    </div>
    <template v-else>
      <div class="relative">
        <svg
          ref="svgEl"
          viewBox="0 0 272 96"
          preserveAspectRatio="none"
          class="w-full h-24 block overflow-visible cursor-crosshair"
          @mousemove="onSvgMouseMove"
          @mouseleave="onSvgMouseLeave">
          <path :d="areaPath" :fill="areaColor" />
          <path
            :d="linePath"
            fill="none"
            :stroke="lineColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round" />
          <circle
            v-if="lastPoint"
            :cx="lastPoint.x"
            :cy="lastPoint.y"
            r="3.5"
            :fill="lineColor" />

          <g v-if="hoveredPoint">
            <line
              :x1="hoveredPoint.x"
              :x2="hoveredPoint.x"
              y1="0"
              y2="96"
              stroke="var(--color-border)"
              stroke-width="1"
              stroke-dasharray="2,2" />
            <circle
              :cx="hoveredPoint.x"
              :cy="hoveredPoint.y"
              r="4"
              :fill="lineColor"
              stroke="var(--color-surface)"
              stroke-width="1.5" />
          </g>
        </svg>

        <div
          v-if="hoveredEntry"
          class="pointer-events-none absolute z-10 rounded-lg border border-border-base bg-surface-high px-2.5 py-1.5 shadow-lg whitespace-nowrap"
          :style="tooltipStyle">
          <div
            class="font-mono text-[9px] font-bold uppercase tracking-widest text-text-ter">
            {{ formatLongDate(hoveredEntry.createdOn) }}
          </div>
          <div class="text-xs font-bold text-text-main">
            {{ tierLabel(hoveredEntry) }} · {{ hoveredEntry.leaguePoints }} LP
          </div>
        </div>
      </div>

      <div
        class="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between gap-2 font-mono text-[10px] font-bold tracking-widest uppercase text-text-ter">
        <span>{{ firstLabel }}</span>
        <span class="text-text-main">{{ nowLabel }}</span>
      </div>
    </template>
  </section>
</template>
