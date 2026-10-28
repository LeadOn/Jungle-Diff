<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
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

defineEmits<{
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
const ladderBody = ref<HTMLElement | null>(null)

/**
 * A purely visual filter: the store keeps every account (see `buildLadder`). The ladder is rebuilt
 * from the full roster, so a smurf still resolves its main's name.
 */
const ladder = computed(() => buildLadder(props.players, queue.value, props.includeSmurfs))
const podium = computed(() => ladder.value.ranked.slice(0, 3))
const rankedRest = computed(() => ladder.value.ranked.slice(3))
const unranked = computed(() => ladder.value.unranked)

const queueLabel = computed(() => (queue.value === 'solo' ? 'Solo/Duo' : 'Flex'))

// Everything that depends on who is looking is resolved after mount: `/` is served from a shared
// SWR cache, and a "Vous" rendered on the server would be cached for every visitor.
const isMounted = ref(false)
const meId = computed(() => (isMounted.value ? playerStore.currentPlayer?.id ?? null : null))

const meSummary = computed(() => {
  if (meId.value === null || !props.players.some(player => player.id === meId.value)) return null
  const me = ladder.value.ranked.find(entry => entry.id === meId.value)
  if (!me) return { bold: `Vous n'êtes pas classé en ${queueLabel.value}`, rest: '' }
  if (me.position === 1) return { bold: 'Vous êtes 1er', rest: '' }
  return {
    bold: `Vous êtes ${me.position}e`,
    rest: me.gap !== null ? `, à ${me.gap} LP de ${me.previousName}` : '',
  }
})

const showLinkInvite = computed(() => isMounted.value && authStore.isInitialized && !authStore.isAuthenticated)

onMounted(() => { isMounted.value = true })

const snapshot = (box: HTMLElement | null): Map<string, { x: number, y: number }> => {
  if (!box || !import.meta.client) return new Map()
  const elements = box.querySelectorAll<HTMLElement>('[data-flip-id]')
  const map = new Map<string, { x: number, y: number }>()
  for (const el of elements) {
    const id = el.dataset.flipId
    if (!id) continue
    const rect = el.getBoundingClientRect()
    map.set(id, { x: rect.left, y: rect.top })
  }
  return map
}

/** Slides every card, avatar and row from where it was to its new place (FLIP). */
const glide = (box: HTMLElement | null, before: Map<string, { x: number, y: number }>) => {
  if (!box || !import.meta.client || before.size === 0) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const supportsLinear = typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', 'linear(0, 1)')
  const easing = supportsLinear
    ? (getComputedStyle(document.documentElement).getPropertyValue('--ease-glide').trim() || 'cubic-bezier(0.2, 0.8, 0.2, 1)')
    : 'cubic-bezier(0.2, 0.8, 0.2, 1)'
  const elements = box.querySelectorAll<HTMLElement>('[data-flip-id]')
  elements.forEach((el, index) => {
    if (!el.animate) return
    const id = el.dataset.flipId
    const was = id ? before.get(id) : undefined
    if (!was) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 120, fill: 'backwards' })
      return
    }
    const rect = el.getBoundingClientRect()
    const dx = was.x - rect.left
    const dy = was.y - rect.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    el.classList.add('moving')
    const anim = el.animate(
      [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
      { duration: 620, easing, delay: Math.min(index * 12, 180), fill: 'backwards' }
    )
    anim.finished.then(() => el.classList.remove('moving'), () => el.classList.remove('moving'))
  })
}

watch([queue, () => props.includeSmurfs], async () => {
  hoveredId.value = null
  const before = snapshot(ladderBody.value)
  await nextTick()
  glide(ladderBody.value, before)
}, { flush: 'pre' })
</script>

<template>
  <section aria-labelledby="crew-ladder-title" class="ladder">
    <div class="mb-3.5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
      <div class="min-w-0">
        <h2 id="crew-ladder-title" class="type-d2">Classement du crew</h2>
        <p class="mt-1 text-[13px] text-ink-2">
          {{ queueLabel }} · {{ ladder.ranked.length }} classés sur {{ ladder.visibleCount }} comptes<template v-if="meSummary"> · <b class="font-[640] text-ink">{{ meSummary.bold }}</b>{{ meSummary.rest }}</template>
        </p>
      </div>
      <UiSegmented v-model="queue" :options="queues" aria-label="File classée" />
    </div>

    <div ref="ladderBody" class="grid gap-4">
      <div
        v-if="podium.length > 0"
        class="podium"
        :class="{ 'podium-3': podium.length === 3, 'podium-2': podium.length === 2 }"
      >
        <LadderPodiumCard
          v-for="entry in podium"
          :key="entry.id"
          :entry="entry"
          :hovered="hoveredId === entry.id"
          :is-me="meId === entry.id"
          @hover="hoveredId = $event"
        />
      </div>
      <UiEmptyState
        v-else
        :title="`Personne n'est classé en ${queueLabel} pour le moment.`"
      />

      <RankTrack
        v-if="ladder.ranked.length > 0"
        :entries="ladder.ranked"
        :hovered-id="hoveredId"
        :me-id="meId"
        @hover="hoveredId = $event"
      />

      <section
        v-if="rankedRest.length > 0 || unranked.length > 0"
        aria-label="Suite du classement"
        class="overflow-hidden rounded-5 border border-line/70 bg-surface shadow-card"
      >
        <LadderRow
          v-for="entry in rankedRest"
          :key="entry.id"
          :entry="entry"
          :hovered="hoveredId === entry.id"
          :is-me="meId === entry.id"
          @hover="hoveredId = $event"
        />
        <template v-if="unranked.length > 0">
          <div class="border-b border-line bg-sunken px-4 pb-2 pt-3 type-label text-ink-3">
            Non classés · {{ unranked.length }}
          </div>
          <LadderRow
            v-for="entry in unranked"
            :key="entry.id"
            :entry="entry"
            :hovered="hoveredId === entry.id"
            :is-me="meId === entry.id"
            @hover="hoveredId = $event"
          />
        </template>
      </section>
    </div>

    <button
      v-if="showLinkInvite"
      type="button"
      class="mt-4 flex w-full cursor-pointer items-center justify-between gap-3 rounded-5 border border-dashed border-line-strong bg-transparent px-[18px] py-3.5 text-left text-[13px] font-semibold text-ink-2 transition-colors duration-120 ease-out hover:bg-sunken hover:text-ink"
      @click="authStore.login('/settings')"
    >
      <span>Vous jouez avec le crew ? Liez votre compte Riot pour apparaître au classement.</span>
      <Icon name="lucide:arrow-right" class="size-4 shrink-0" />
    </button>
  </section>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.ladder {
  container: ladder / inline-size;
}

.podium {
  display: grid;
  gap: 14px;
  align-items: start;
}

@container ladder (min-width: 640px) {
  .podium.podium-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .podium.podium-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .podium.podium-3 :deep(.pod.p2) {
    order: 1;
    margin-top: 22px;
  }

  .podium.podium-3 :deep(.pod.p1) {
    order: 2;
  }

  .podium.podium-3 :deep(.pod.p3) {
    order: 3;
    margin-top: 22px;
  }
}
</style>
