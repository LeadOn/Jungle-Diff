<script setup lang="ts">
import { computed } from 'vue'
import { useRuntimeConfig } from '#app'
import type { LeaguePlayer } from '~/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useLolStore } from '~/stores/lol'
import { getProfileIconUrl } from '~/utils/ddragon'
import { championSplashUrl } from '~/utils/lol-champion'
import { playerDisplayName } from '~/utils/lol-ladder'
import { isSmurf } from '~/utils/lol-smurf'

const props = defineProps<{
  player: LeaguePlayer
  currentLoLPatch: string
  isRefreshing?: boolean
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

const config = useRuntimeConfig()
const apiUrl = config.public.gameOnApiUrl
const lolStore = useLolStore()

const name = computed(() => playerDisplayName(props.player))

const syncedAgoLabel = computed(() => {
  if (props.player.lolRefreshedOn) {
    const date = new Date(props.player.lolRefreshedOn)
    if (!isNaN(date.getTime())) return 'Synchro il y a ' + formatDistanceToNow(date, { locale: fr })
  }
  return 'Jamais synchronisé'
})

const primaryPlayer = computed(() => {
  if (!isSmurf(props.player)) return null
  return lolStore.players.find(p => p.id === props.player.primaryPlayerId) ?? null
})

const avatarStyle = computed(() => {
  if (props.player.lolIconId != null) {
    return { backgroundImage: `url('${getProfileIconUrl(props.player.lolIconId, props.currentLoLPatch)}')` }
  }
  if (props.player.profilePictureUrl) return { backgroundImage: `url('${apiUrl}/player/${props.player.id}/pp')` }
  return {}
})

const primaryIconStyle = computed(() => (primaryPlayer.value?.lolIconId != null
  ? { backgroundImage: `url('${getProfileIconUrl(primaryPlayer.value.lolIconId, props.currentLoLPatch)}')` }
  : {}))

/**
 * The splash behind the hero is the player's main champion. `mainChampionName` is only served by the
 * crew list; until it is loaded, the profile's own most played champion stands in. That one is read
 * once, on purpose: it follows the period filter, and the backdrop should not change with it.
 */
const initialTopChampion = props.player.performanceStats?.championStats?.[0]?.championName ?? null
const heroChampion = computed(() =>
  lolStore.players.find(p => p.id === props.player.id)?.mainChampionName ?? initialTopChampion,
)
const heroStyle = computed(() => (heroChampion.value
  ? { backgroundImage: `url('${championSplashUrl(heroChampion.value)}')` }
  : {}))

const externalSlug = computed(() => (props.player.riotGamesNickname && props.player.riotGamesTagLine
  ? `${encodeURIComponent(props.player.riotGamesNickname)}-${encodeURIComponent(props.player.riotGamesTagLine)}`
  : null))
</script>

<template>
  <section aria-label="Identité" class="relative animate-rise overflow-hidden rounded-[30px] bg-ink px-5 py-[22px] text-white shadow-hero md:px-8 md:py-[30px]">
    <div aria-hidden="true" class="absolute inset-0 bg-cover bg-no-repeat bg-[position:right_22%]" :style="heroStyle" />
    <div aria-hidden="true" class="absolute inset-0 bg-scrim-hero" />

    <div class="relative flex flex-wrap items-end justify-between gap-6">
      <div class="flex min-w-0 flex-wrap items-center gap-[22px]">
        <span class="relative size-[84px] shrink-0 md:size-28">
          <span class="absolute inset-0 rounded-[28px] border-[3px] border-white/90 bg-[#2A3A2F] bg-cover bg-center shadow-[0_14px_30px_-10px_rgba(0,0,0,0.6)]" :style="avatarStyle">
            <img v-if="player.lolIconId == null && !player.profilePictureUrl" src="~/assets/img/JungleDiff_Logo.png" alt="" class="size-full object-contain p-3">
          </span>
          <span
            v-if="player.lolSummonerLevel != null"
            title="Niveau d'invocateur"
            class="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-[3px] font-mono text-[11.5px] font-semibold text-ink"
          >{{ player.lolSummonerLevel }}</span>
        </span>

        <div class="flex min-w-0 flex-col gap-3">
          <div class="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
            <h1 class="m-0 min-w-0 break-words text-5xl font-bold leading-[0.95] tracking-[-0.05em] md:text-[64px] rail:text-[76px]">{{ name }}</h1>
            <span v-if="player.riotGamesTagLine" class="text-[22px] font-semibold text-white/60">#{{ player.riotGamesTagLine }}</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="player.archived"
              title="Ce compte n'est plus suivi"
              class="rounded-full border border-dashed border-white/45 bg-white/14 px-3 py-[5px] text-[12.5px] font-bold"
            >Archivé</span>
            <NuxtLink
              v-if="primaryPlayer"
              :to="`/summoner/${primaryPlayer.id}`"
              title="Voir le compte principal"
              class="inline-flex items-center gap-[7px] rounded-full border border-brand-gold-bright/45 bg-brand-gold-bright/20 py-[3px] pl-[3px] pr-3 text-[12.5px] font-bold text-on-photo-gold transition-colors hover:bg-brand-gold-bright/35"
            >
              <span class="size-[22px] rounded-full bg-white/20 bg-cover bg-center" :style="primaryIconStyle" />
              Smurf de {{ playerDisplayName(primaryPlayer) }} →
            </NuxtLink>
            <span class="inline-flex items-center gap-[7px] rounded-full border border-white/20 bg-white/10 px-3 py-[5px] text-[12.5px] font-bold">
              <Icon name="lucide:refresh-cw" class="size-3 text-on-photo-green" :class="{ 'animate-spin': isRefreshing }" />
              {{ isRefreshing ? 'Synchronisation…' : syncedAgoLabel }}
            </span>
            <template v-if="externalSlug">
              <span aria-hidden="true" class="mx-0.5 h-5 w-px bg-white/20" />
              <a
                :href="`https://www.op.gg/summoners/euw/${externalSlug}`"
                target="_blank"
                rel="noopener noreferrer"
                title="Accéder à OP.GG"
                class="flex size-8 items-center justify-center rounded-full bg-white/92 transition-transform duration-[250ms] ease-spring hover:-translate-y-0.5 hover:scale-[1.08]"
              >
                <img src="/img/external/opgg.png" alt="OP.GG" class="size-4 rounded-[3px]">
              </a>
              <a
                :href="`https://dpm.lol/${externalSlug}`"
                target="_blank"
                rel="noopener noreferrer"
                title="Accéder à DPM.LoL"
                class="flex size-8 items-center justify-center rounded-full bg-white/92 transition-transform duration-[250ms] ease-spring hover:-translate-y-0.5 hover:scale-[1.08]"
              >
                <img src="/img/external/dpmlol.png" alt="DPM.LoL" class="size-4 rounded-[3px]">
              </a>
            </template>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2.5">
        <button
          type="button"
          :disabled="isRefreshing"
          :aria-busy="isRefreshing"
          class="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-brand-gold-bright px-5 text-sm font-bold text-ink transition-[scale,opacity] duration-[250ms] ease-spring hover:scale-[1.04] disabled:cursor-not-allowed disabled:opacity-60"
          @click="emit('refresh')"
        >
          <Icon name="lucide:refresh-cw" class="size-3.5" :class="{ 'animate-spin': isRefreshing }" />
          {{ isRefreshing ? 'Rafraîchissement…' : 'Rafraîchir' }}
        </button>
        <span
          title="Pas encore implémenté"
          aria-disabled="true"
          class="inline-flex h-11 cursor-not-allowed select-none items-center gap-2 rounded-full border border-white/22 bg-white/10 pl-5 pr-2 text-sm font-bold text-white/70"
        >
          Comparer
          <span class="rounded-full bg-white/14 px-[9px] py-1 text-[11px] font-bold">Bientôt</span>
        </span>
      </div>
    </div>
  </section>
</template>
