<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePatchStore } from '~/stores/patch'
import { getProfileIconUrl } from '~/utils/ddragon'
import { playerDisplayName } from '~/utils/lol-ladder'
import type { LoLSummonerPerformanceStats } from '~/lib/types'

type Period = '7j' | '30j' | 'all-time'

const props = defineProps<{
  period: Period
  stats: LoLSummonerPerformanceStats | null
}>()

const patchStore = usePatchStore()

const PERIOD_BADGE: Record<Period, string> = { '7j': '7 j', '30j': '30 j', 'all-time': 'Toujours' }

const badge = computed(() => PERIOD_BADGE[props.period])

// Same rule as the champions: the first few, the rest on demand.
const COLLAPSED_COUNT = 5
const expanded = ref(false)

const duos = computed(() => (props.stats?.duoStats ?? []).map(d => ({
  id: d.player.id,
  name: playerDisplayName(d.player),
  iconUrl: d.player.lolIconId != null ? getProfileIconUrl(d.player.lolIconId, patchStore.currentPatch) : null,
  games: `${d.gamesPlayed} partie${d.gamesPlayed > 1 ? 's' : ''} ensemble`,
  winRate: Math.round(d.winRate),
})))
const visibleDuos = computed(() => (expanded.value ? duos.value : duos.value.slice(0, COLLAPSED_COUNT)))
const hiddenCount = computed(() => duos.value.length - COLLAPSED_COUNT)
</script>

<template>
  <UiPanel title="Duos" title-id="profile-duos" :meta="badge">
    <p v-if="duos.length === 0" class="type-small m-0 px-4 pb-4 text-ink-2">
      Aucun duo suivi sur cette période.
    </p>
    <div v-else>
      <NuxtLink
        v-for="d in visibleDuos"
        :key="d.id"
        :to="`/summoner/${d.id}`"
        class="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-4 py-2.5 text-inherit no-underline transition-colors duration-[120ms] ease-out outline-offset-[-3px] last:rounded-b-5 hover:bg-[color-mix(in_oklch,var(--sunken)_70%,var(--surface))]"
      >
        <span class="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-sunken bg-cover bg-center" :style="d.iconUrl ? { backgroundImage: `url('${d.iconUrl}')` } : undefined">
          <Icon v-if="!d.iconUrl" name="lucide:user" class="size-4 text-ink-3" />
        </span>
        <span class="grid min-w-0 gap-px">
          <b class="truncate text-[0.875rem] font-[640] text-ink">{{ d.name }}</b>
          <span class="truncate text-[0.75rem] text-ink-3">{{ d.games }}</span>
        </span>
        <span class="flex items-baseline gap-0.5" :class="d.winRate >= 50 ? 'text-win-ink' : 'text-loss-ink'">
          <span class="fig text-[1.75rem]">{{ d.winRate }}</span>
          <small class="text-[0.75rem] font-semibold">%</small>
        </span>
      </NuxtLink>
      <div v-if="hiddenCount > 0" class="border-t border-line p-2">
        <UiButton
          variant="quiet"
          size="sm"
          block
          :aria-expanded="expanded"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Réduire' : hiddenCount > 1 ? `Voir les ${hiddenCount} autres` : 'Voir le dernier' }}
        </UiButton>
      </div>
    </div>
  </UiPanel>
</template>
