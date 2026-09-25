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
 * for `window=Last7Days`), told as a player card.
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

const iconStyle = computed(() => (props.fact.player.lolIconId != null
  ? { backgroundImage: `url('${getProfileIconUrl(props.fact.player.lolIconId, patchStore.currentPatch)}')` }
  : {}))

// `mainChampionName` is only served by the crew list, not on the fact's own player.
const mainChampion = computed(() => crewPlayer.value?.mainChampionName ?? null)
const backdropStyle = computed(() => (mainChampion.value
  ? { backgroundImage: `url('${championSplashUrl(mainChampion.value)}')` }
  : {}))

const lpClass = computed(() => (props.fact.lpChange < 0 ? 'text-on-photo-red' : 'text-on-photo-lime'))

const summary = computed(() => {
  const f = props.fact
  const games = `${f.gamesThisWeek} partie${f.gamesThisWeek > 1 ? 's' : ''}`
  const streak = f.longestWinStreakThisWeek > 1 ? `, dont ${f.longestWinStreakThisWeek} succès d'affilée` : ''
  return `${games} à ${Math.round(f.winRateThisWeek)}\u00A0% de victoires${streak}.`
})
</script>

<template>
  <section aria-labelledby="player-of-the-week" class="relative overflow-hidden rounded-[26px] bg-ink p-[22px] text-white shadow-hero">
    <div aria-hidden="true" class="absolute inset-0 bg-cover bg-top bg-no-repeat" :style="backdropStyle" />
    <div aria-hidden="true" class="absolute inset-0 bg-scrim-rise" />

    <div class="relative text-shadow-photo">
      <div id="player-of-the-week" class="inline-flex rounded-full border border-brand-gold-bright/40 bg-brand-gold-bright/20 px-[11px] py-1 text-xs font-bold text-on-photo-gold">Joueur de la semaine</div>
      <div class="mt-[72px] flex items-center gap-3">
        <span class="size-[54px] shrink-0 rounded-2xl border-2 border-white/85 bg-ink bg-cover bg-center" :style="iconStyle" />
        <span class="flex min-w-0 flex-col gap-[3px]">
          <span class="truncate text-[21px] font-bold tracking-[-0.02em]">{{ name }}</span>
          <span v-if="soloRank" class="flex items-center gap-[5px] text-[13px] font-semibold text-white/85">
            <img :src="tierEmblemUrl(soloRank)" alt="" class="size-5 object-contain">
            {{ tierLabel(soloRank) }} · {{ soloRank.leaguePoints }} LP
          </span>
        </span>
      </div>
      <div class="mt-[18px] flex items-baseline gap-2 leading-[0.9]" :class="lpClass">
        <span class="text-[64px] font-bold tracking-[-0.05em]">{{ formatSigned(fact.lpChange) }}</span>
        <span class="text-xl font-bold">LP</span>
        <span class="ml-1 text-[13px] font-semibold text-white/72">en 7 jours</span>
      </div>
      <p class="mt-3 text-pretty text-sm font-medium leading-normal text-white/86">{{ summary }}</p>
      <NuxtLink
        :to="`/summoner/${playerId}`"
        class="mt-[18px] flex h-11 items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-ink text-shadow-none transition-transform duration-[250ms] ease-spring hover:scale-[1.03]"
      >
        Voir sa fiche →
      </NuxtLink>
    </div>
  </section>
</template>
