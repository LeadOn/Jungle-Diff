<script setup lang="ts">
import { computed } from 'vue'
import type { LeaguePlayer, LeagueOfLegendsRank } from '~/lib/types'
import { tierLabel, tierEmblemUrl, tierGlowShadow, tierGlowBackground } from '~/utils/lol-tier'

const props = defineProps<{
  player: LeaguePlayer
  soloWins: number
  soloLosses: number
  soloWinRate: number
  flexWins: number
  flexLosses: number
  flexWinRate: number
}>()

const hasSoloRank = computed(() => props.player.leagueOfLegendsSoloRank != null)
const hasFlexRank = computed(() => props.player.leagueOfLegendsFlexRank != null)
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <!-- Solo Queue Card -->
    <div class="relative">
      <div
        class="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] blur-3xl"
        :style="{ background: tierGlowBackground(player.leagueOfLegendsSoloRank) }"
      ></div>
      <div
        class="border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 flex items-center gap-4 rounded-2xl border p-5 shadow-sm backdrop-blur-md backdrop-contrast-100 backdrop-saturate-100 backdrop-filter"
      >
        <img
          :src="tierEmblemUrl(player.leagueOfLegendsSoloRank)"
          class="h-16 w-16 shrink-0"
          :style="{ filter: tierGlowShadow(player.leagueOfLegendsSoloRank) }"
        />
        <div class="min-w-0">
          <span
            class="bg-blue-500/15 text-blue-500 inline-block rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
            >Solo 5v5</span
          >
          <div v-if="!hasSoloRank">
            <p class="text-gray-900 dark:text-white mt-2 text-sm">
              Non classé
            </p>
          </div>
          <div v-else>
            <p
              class="text-gray-900 dark:text-white mt-2 truncate text-lg font-semibold"
            >
              {{ tierLabel(player.leagueOfLegendsSoloRank) }}
              &middot;
              {{ player.leagueOfLegendsSoloRank!.leaguePoints }} LP
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-300">
              <span class="text-green-500 font-semibold"
                >{{ soloWins }} V</span
              >
              —
              <span class="text-red-500 font-semibold"
                >{{ soloLosses }} D</span
              >
              &middot; {{ soloWinRate.toFixed(0) }}% de winrate
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Flex Queue Card -->
    <div class="relative">
      <div
        class="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] blur-3xl"
        :style="{ background: tierGlowBackground(player.leagueOfLegendsFlexRank) }"
      ></div>
      <div
        class="border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 flex items-center gap-4 rounded-2xl border p-5 shadow-sm backdrop-blur-md backdrop-contrast-100 backdrop-saturate-100 backdrop-filter"
      >
        <img
          :src="tierEmblemUrl(player.leagueOfLegendsFlexRank)"
          class="h-16 w-16 shrink-0"
          :style="{ filter: tierGlowShadow(player.leagueOfLegendsFlexRank) }"
        />
        <div class="min-w-0">
          <span
            class="bg-yellow-500/15 text-yellow-500 inline-block rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
            >Flex 5v5</span
          >
          <div v-if="!hasFlexRank">
            <p class="text-gray-900 dark:text-white mt-2 text-sm">
              Non classé
            </p>
          </div>
          <div v-else>
            <p
              class="text-gray-900 dark:text-white mt-2 truncate text-lg font-semibold"
            >
              {{ tierLabel(player.leagueOfLegendsFlexRank) }}
              &middot;
              {{ player.leagueOfLegendsFlexRank!.leaguePoints }} LP
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-300">
              <span class="text-green-500 font-semibold"
                >{{ flexWins }} V</span
              >
              —
              <span class="text-red-500 font-semibold"
                >{{ flexLosses }} D</span
              >
              &middot; {{ flexWinRate.toFixed(0) }}% de winrate
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
