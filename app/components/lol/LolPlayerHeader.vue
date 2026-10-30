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
  <section aria-label="Identité" class="relative overflow-hidden rounded-5 bg-night px-5 py-[22px] text-on-night shadow-card md:px-8 md:py-[30px]">
    <!-- The splash and its scrim: identity sits on the opaque left side, chips on night pills. Under
         768px the identity spans the whole width, so a uniform night layer joins the side scrim. -->
    <div
      aria-hidden="true"
      data-photo
      class="absolute inset-0 bg-night-2 bg-cover bg-no-repeat bg-[position:right_22%] after:absolute after:inset-0 after:bg-scrim-side after:content-[''] max-md:before:absolute max-md:before:inset-0 max-md:before:bg-[linear-gradient(color-mix(in_oklch,var(--night)_50%,transparent),color-mix(in_oklch,var(--night)_50%,transparent))] max-md:before:content-['']"
      :style="heroStyle"
    />

    <div class="relative flex flex-wrap items-end justify-between gap-6">
      <div class="flex min-w-0 flex-wrap items-center gap-[22px]">
        <span class="relative size-[84px] shrink-0 md:size-28">
          <span class="absolute inset-0 overflow-hidden rounded-full border-[3px] border-on-night bg-night-2 bg-cover bg-center" :style="avatarStyle">
            <img v-if="player.lolIconId == null && !player.profilePictureUrl" src="~/assets/img/JungleDiff_Logo.png" alt="" class="size-full object-contain p-3">
          </span>
          <span
            v-if="player.lolSummonerLevel != null"
            title="Niveau d'invocateur"
            class="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-on-night px-2 py-[3px] font-mono text-[11px] leading-none font-semibold tabular-nums text-night"
          >{{ player.lolSummonerLevel }}</span>
        </span>

        <div class="flex min-w-0 flex-col gap-3">
          <!-- The tag goes under the name, not beside it: a long name would push it onto the art. -->
          <div class="flex min-w-0 flex-col items-start gap-1.5">
            <h1 class="type-d1 m-0 min-w-0 break-words text-on-night">{{ name }}</h1>
            <span v-if="player.riotGamesTagLine" class="type-mono text-[0.9375rem] text-on-night-2">#{{ player.riotGamesTagLine }}</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span
              v-if="player.archived"
              title="Ce compte n'est plus suivi"
              class="inline-flex h-7 items-center rounded-1 border border-dashed border-on-night-2 bg-night/80 px-2.5 text-[12.5px] font-semibold text-on-night"
            >Archivé</span>
            <NuxtLink
              v-if="primaryPlayer"
              :to="`/summoner/${primaryPlayer.id}`"
              title="Voir le compte principal"
              class="inline-flex h-7 items-center gap-[7px] rounded-2 border border-on-night-line bg-night/80 pr-2.5 pl-[3px] text-[12.5px] font-semibold text-on-night no-underline transition-colors duration-[120ms] ease-out hover:bg-night-2"
            >
              <span class="size-[22px] rounded-full bg-night-2 bg-cover bg-center" :style="primaryIconStyle" />
              Smurf de {{ playerDisplayName(primaryPlayer) }} →
            </NuxtLink>
            <span class="inline-flex h-7 items-center gap-[7px] rounded-1 bg-night/80 px-2.5 text-[12.5px] font-semibold text-on-night">
              <Icon name="lucide:refresh-cw" class="size-3 text-on-night-win" :class="{ 'animate-spin': isRefreshing }" />
              {{ isRefreshing ? 'Synchronisation…' : syncedAgoLabel }}
            </span>
            <template v-if="externalSlug">
              <span aria-hidden="true" class="mx-0.5 h-5 w-px bg-on-night-line" />
              <a
                :href="`https://www.op.gg/summoners/euw/${externalSlug}`"
                target="_blank"
                rel="noopener noreferrer"
                title="Accéder à OP.GG"
                class="flex size-8 items-center justify-center rounded-2 bg-on-night transition-colors duration-[120ms] ease-out hover:bg-on-night-2"
              >
                <img src="/img/external/opgg.png" alt="OP.GG" class="size-4 rounded-1">
              </a>
              <a
                :href="`https://dpm.lol/${externalSlug}`"
                target="_blank"
                rel="noopener noreferrer"
                title="Accéder à DPM.LoL"
                class="flex size-8 items-center justify-center rounded-2 bg-on-night transition-colors duration-[120ms] ease-out hover:bg-on-night-2"
              >
                <img src="/img/external/dpmlol.png" alt="DPM.LoL" class="size-4 rounded-1">
              </a>
            </template>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2.5">
        <UiButton
          variant="night"
          size="lg"
          :busy="isRefreshing"
          :disabled="isRefreshing"
          @click="emit('refresh')"
        >
          <Icon name="lucide:refresh-cw" class="size-4" :class="{ 'animate-spin': isRefreshing }" />
          {{ isRefreshing ? 'Rafraîchissement…' : 'Rafraîchir' }}
        </UiButton>
        <span
          title="Pas encore implémenté"
          aria-disabled="true"
          class="inline-flex h-11 cursor-not-allowed items-center gap-2 rounded-2 border border-on-night-line bg-night/80 pr-2 pl-[18px] text-[0.9375rem] font-semibold text-on-night-2 select-none"
        >
          Comparer
          <span class="rounded-1 bg-night-2 px-1.5 py-1 text-[11px] leading-none font-semibold text-on-night">Bientôt</span>
        </span>
      </div>
    </div>
  </section>
</template>
