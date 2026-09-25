<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { LeaguePlayer } from '~/lib/types'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { buildLadder } from '~/utils/lol-ladder'
import type { LadderQueue } from '~/utils/lol-ladder'
import LadderPodiumCard from '~/components/home/LadderPodiumCard.vue'
import LadderRow from '~/components/home/LadderRow.vue'
import RankTrack from '~/components/home/RankTrack.vue'

const props = withDefaults(defineProps<{
  players?: LeaguePlayer[]
  /** Owned by the page: the same flag re-queries the week and the recent games. */
  includeSmurfs?: boolean
}>(), { players: () => [], includeSmurfs: false })

const emit = defineEmits<{
  (e: 'update:includeSmurfs', value: boolean): void
}>()

const authStore = useAuthStore()
const playerStore = usePlayerStore()

const queue = ref<LadderQueue>('solo')
const queues: { value: LadderQueue, label: string }[] = [
  { value: 'solo', label: 'Solo/Duo' },
  { value: 'flex', label: 'Flex' },
]

/** One hover shared by the podium, the rank scale and the rows, so each highlights the others. */
const hoveredId = ref<number | null>(null)

/**
 * A purely visual filter: the store keeps every account (see `buildLadder`). The ladder is rebuilt
 * from the full roster, so a smurf still resolves its main's name.
 */
const ladder = computed(() => buildLadder(props.players, queue.value, props.includeSmurfs))
const podium = computed(() => ladder.value.ranked.slice(0, 3))
const rows = computed(() => [...ladder.value.ranked.slice(3), ...ladder.value.unranked])

const subtitle = computed(() => `${ladder.value.ranked.length} classés · ${ladder.value.visibleCount} joueurs`)

// Everything that depends on who is looking is resolved after mount: `/` is served from a shared
// SWR cache, and a "Vous" rendered on the server would be cached for every visitor.
const isMounted = ref(false)
const meId = computed(() => (isMounted.value ? playerStore.currentPlayer?.id ?? null : null))

const meText = computed(() => {
  if (meId.value === null || !props.players.some(player => player.id === meId.value)) return null
  const me = ladder.value.ranked.find(entry => entry.id === meId.value)
  if (!me) return `Vous n'êtes pas classé en ${queue.value === 'solo' ? 'Solo/Duo' : 'Flex'}`
  if (me.position === 1) return 'Vous êtes en tête !'
  return `Vous êtes ${me.position}e, à ${me.gap} LP de ${me.previousName}`
})

const showLinkInvite = computed(() => isMounted.value && authStore.isInitialized && !authStore.isAuthenticated)

/** Wide screens show the podium as 2 · 1 · 3, the leader raised in the middle. */
const podiumPlacement = (position: number | null) => {
  if (podium.value.length < 3) return ''
  if (position === 1) return 'sm:order-2'
  return position === 2 ? 'sm:order-1 sm:mt-[34px]' : 'sm:order-3 sm:mt-[34px]'
}

const podiumColumns = computed(() => ({
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
}[podium.value.length] ?? ''))

onMounted(() => { isMounted.value = true })

const toggleSmurfs = () => {
  hoveredId.value = null
  emit('update:includeSmurfs', !props.includeSmurfs)
}

const selectQueue = (value: LadderQueue) => {
  hoveredId.value = null
  queue.value = value
}
</script>

<template>
  <section aria-labelledby="crew-ladder-title">
    <div class="mb-5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3.5">
      <div class="min-w-0">
        <h2 id="crew-ladder-title" class="text-[32px] font-bold tracking-[-0.035em]">Classement du crew</h2>
        <p class="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-text-sec">
          {{ subtitle }}
          <span v-if="meText" class="rounded-full border border-border-accent bg-brand-gold-soft px-2.5 py-[3px] text-[12.5px] font-bold text-text-main">{{ meText }}</span>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          type="button"
          role="switch"
          :aria-checked="includeSmurfs"
          class="inline-flex cursor-pointer items-center gap-[9px] text-[13.5px] font-bold"
          @click="toggleSmurfs"
        >
          <span
            class="relative h-[22px] w-[38px] shrink-0 rounded-full border border-border-base transition-colors duration-200"
            :class="includeSmurfs ? 'bg-brand-shell' : 'bg-surface-base'"
          >
            <span
              class="absolute top-0.5 size-3.5 rounded-full bg-text-main transition-[left] duration-300 ease-spring"
              :class="includeSmurfs ? 'left-[18px]' : 'left-0.5'"
            />
          </span>
          Smurfs
        </button>
        <div role="group" aria-label="File classée" class="flex rounded-full border border-border-base bg-surface-base p-[3px]">
          <button
            v-for="option in queues"
            :key="option.value"
            type="button"
            :aria-pressed="queue === option.value"
            class="cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors duration-200"
            :class="queue === option.value ? 'bg-inverse text-inverse-text' : 'text-text-main'"
            @click="selectQueue(option.value)"
          >{{ option.label }}</button>
        </div>
      </div>
    </div>

    <div v-if="podium.length > 0" class="grid items-start gap-4" :class="podiumColumns">
      <LadderPodiumCard
        v-for="entry in podium"
        :key="entry.id"
        :entry="entry"
        :hovered="hoveredId === entry.id"
        :is-me="meId === entry.id"
        :class="podiumPlacement(entry.position)"
        @hover="hoveredId = $event"
      />
    </div>
    <p v-else class="rounded-3xl border border-border-base bg-surface-base p-6 text-sm font-semibold text-text-sec shadow-card">
      Personne n'est classé en {{ queue === 'solo' ? 'Solo/Duo' : 'Flex' }} pour le moment.
    </p>

    <RankTrack
      v-if="ladder.ranked.length > 0"
      :entries="ladder.ranked"
      :hovered-id="hoveredId"
      :me-id="meId"
      @hover="hoveredId = $event"
    />

    <div v-if="rows.length > 0" class="mt-[22px] overflow-hidden rounded-3xl border border-border-base bg-surface-base shadow-card">
      <LadderRow
        v-for="entry in rows"
        :key="entry.id"
        :entry="entry"
        :hovered="hoveredId === entry.id"
        :is-me="meId === entry.id"
        @hover="hoveredId = $event"
      />
    </div>

    <button
      v-if="showLinkInvite"
      type="button"
      class="mt-4 flex w-full cursor-pointer items-center justify-between gap-3.5 rounded-[18px] border-[1.5px] border-dashed border-border-accent px-[18px] py-3.5 text-left text-sm font-bold transition-colors duration-200 hover:bg-win-soft"
      @click="authStore.login('/settings')"
    >
      <span>Vous jouez avec le crew ? Liez votre compte Riot pour apparaître au classement.</span>
      <Icon name="lucide:arrow-right" class="size-[18px] shrink-0" />
    </button>
  </section>
</template>
