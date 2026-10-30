<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LoLImportCustomGameResultDto } from '~/lib/types'
import { useAdminStore } from '~/stores/admin'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { errorStatusCode, isAbortError } from '~/lib/types/error'
import { adminErrorMessage } from '~/utils/lol-admin'
import { readCustomGameFiles } from '~/utils/lol-custom-game'
import AdminResult from './AdminResult.vue'
import AdminRoute from './AdminRoute.vue'

/**
 * Imports a custom game: Riot's API does not serve them, so the payload comes from the League
 * client, dumped by `fetch_custom_games_lcu.py`. The game file and its `.timeline.json` can be dropped
 * together; the timeline is optional.
 */
const admin = useAdminStore()
const api = useGameOnLol()

const fileLabel = ref('')
const isDragging = ref(false)
const error = ref<string | null>(null)
const result = ref<LoLImportCustomGameResultDto | null>(null)

const busy = computed(() => admin.isBusy('custom-import'))

const dropTitle = computed(() => {
  if (busy.value) return 'Import en cours…'
  return fileLabel.value || 'Déposer un fichier JSON'
})

const dropSub = computed(() => {
  if (busy.value) return 'Lecture de la partie et de la timeline'
  return fileLabel.value ? 'Cliquer pour importer un autre fichier' : 'ou cliquer pour parcourir · partie et .timeline.json ensemble'
})

const figures = computed(() => (result.value
  ? [
      { value: result.value.participantCount, label: 'participants' },
      { value: result.value.linkedPlayerCount, label: 'liés au crew' },
      { value: result.value.timelineFrameCount, label: 'frames de timeline' },
    ]
  : []))

const onFiles = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  isDragging.value = false
  if (files.length === 0 || busy.value) return

  fileLabel.value = files.map(file => file.name).join(' + ')
  error.value = null
  result.value = null

  await admin.runExclusive('custom-import', async () => {
    const read = await readCustomGameFiles(files)
    if (!read.ok) {
      error.value = read.error
      return
    }

    try {
      result.value = await api.importCustomGame(read.payload, admin.signal())
      admin.toast('Partie personnalisée importée')
    } catch (failure) {
      if (isAbortError(failure)) return
      console.error('[admin] Custom game import failed:', failure)
      error.value = errorStatusCode(failure) === 400
        ? `400 · L'API n'a pas su lire ${read.matchId ?? 'cette partie'} : le fichier vient-il bien du client LoL ?`
        : adminErrorMessage(failure, 'L\'import a échoué.')
    }
  })

  // Lets the same file be picked again after a failure.
  input.value = ''
}
</script>

<template>
  <div class="flex flex-col gap-3.5 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-5 shadow-card">
    <div>
      <h2 class="m-0 type-title text-ink">Importer une partie personnalisée</h2>
      <p class="mt-1 type-body text-pretty text-ink-2">
        Riot ne sert pas les parties personnalisées : déposez le JSON extrait du client LoL par fetch_custom_games_lcu.py.
      </p>
    </div>

    <label
      class="relative flex min-h-[108px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-3 border-[1.5px] border-dashed p-4 text-center transition-colors duration-120 ease-out focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus"
      :class="busy || isDragging ? 'border-canopy bg-canopy-soft' : 'border-line-strong bg-sunken hover:border-ink-3'"
      @dragenter="isDragging = true"
      @dragleave="isDragging = false"
    >
      <input
        type="file"
        accept=".json,application/json"
        multiple
        :disabled="busy"
        class="absolute inset-0 cursor-pointer opacity-0"
        @change="onFiles"
      >
      <span class="text-sm font-semibold text-ink">{{ dropTitle }}</span>
      <span class="font-mono text-[11px] text-ink-2">{{ dropSub }}</span>
    </label>

    <AdminResult v-if="error" tone="error">{{ error }}</AdminResult>

    <div v-if="result && !busy" class="flex flex-col gap-2.5 rounded-3 bg-sunken p-3.5">
      <span class="flex flex-wrap items-center gap-2">
        <span class="type-mono text-ink">{{ result.matchId }}</span>
        <span
          class="inline-flex h-5 items-center rounded-1 px-1.5 text-[11px] font-[650]"
          :class="result.replaced ? 'border border-line-strong text-ink-2' : 'bg-canopy-soft text-canopy'"
        >{{ result.replaced ? 'Remplacée' : 'Nouvelle' }}</span>
      </span>
      <div class="grid grid-cols-3 gap-2">
        <span v-for="figure in figures" :key="figure.label" class="flex flex-col gap-px">
          <span class="fig text-[26px] text-ink">{{ figure.value }}</span>
          <span class="mt-1 text-xs text-ink-2">{{ figure.label }}</span>
        </span>
      </div>
      <span class="text-[13px] font-semibold text-ink">Riot ID sans joueur GameOn</span>
      <span v-if="result.unlinkedRiotIds.length" class="flex flex-wrap gap-1.5">
        <span
          v-for="riotId in result.unlinkedRiotIds"
          :key="riotId"
          class="inline-flex h-6 items-center rounded-1 border border-line-strong bg-surface px-2 font-mono text-[11px] font-medium text-ink"
        >{{ riotId }}</span>
      </span>
      <span v-else class="text-[13px] text-ink-2">Aucun : chaque participant est un joueur suivi.</span>
    </div>

    <AdminRoute>POST /lol/Match/custom/import · gameon_admin</AdminRoute>
  </div>
</template>
