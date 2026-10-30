<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LoLRecomputeRankChangesResultDto } from '~/lib/types'
import { useAdminStore } from '~/stores/admin'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { isAbortError } from '~/lib/types/error'
import { accountRiotId, adminErrorMessage, sortAccounts } from '~/utils/lol-admin'
import AdminButton from './AdminButton.vue'
import AdminResult from './AdminResult.vue'
import AdminRoute from './AdminRoute.vue'

/**
 * Re-attributes the LP of every ranked game from the stored rank snapshots. The rank refresh keeps
 * the last week right on its own; this is the backfill after a late import or a change of rule.
 */
const admin = useAdminStore()
const api = useGameOnLol()

/** `'all'`, or the id of the one account to recompute. */
const scope = ref<'all' | number>('all')
const result = ref<LoLRecomputeRankChangesResultDto | null>(null)
const error = ref<string | null>(null)

const busy = computed(() => admin.isBusy('recompute'))

const scopeOptions = computed(() => sortAccounts(admin.accounts.filter(account => !account.archived))
  .map(account => ({ value: account.id, label: accountRiotId(account) })))

const figures = computed(() => {
  const run = result.value
  if (!run) return []
  return [
    // Counts of written rows, not game results: no win/loss colour on any of them.
    { value: String(run.participationsScanned), label: 'participations lues', tone: 'bg-sunken text-ink' },
    { value: String(run.participationsWithRankChange), label: 'avec LP attribués', tone: 'bg-sunken text-ink' },
    { value: `+${run.created}`, label: 'LP écrits', tone: 'bg-sunken text-ink' },
    { value: String(run.updated), label: 'LP corrigés', tone: 'bg-sunken text-ink' },
    { value: `−${run.removed}`, label: 'retirés (ambigus)', tone: 'bg-sunken text-ink' },
  ]
})

const onScope = () => {
  result.value = null
  error.value = null
}

const recompute = async () => {
  result.value = null
  error.value = null
  await admin.runExclusive('recompute', async () => {
    try {
      result.value = await api.recomputeRankChanges(scope.value === 'all' ? null : scope.value, admin.signal())
      admin.toast('Recalcul des LP terminé')
    } catch (failure) {
      if (isAbortError(failure)) return
      console.error('[admin] Rank change recompute failed:', failure)
      error.value = adminErrorMessage(failure, 'Le recalcul des LP a échoué.')
    }
  })
}
</script>

<template>
  <div class="flex flex-col gap-3.5 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-5 shadow-card">
    <div>
      <h2 class="m-0 type-title text-ink">Recalculer les LP par partie</h2>
      <p class="mt-1 type-body text-pretty text-ink-2">
        Réattribue les LP gagnés ou perdus à chaque partie classée à partir des snapshots de rang. Aucun appel à Riot. Utile après un import tardif ou un changement de règle.
      </p>
    </div>

    <div class="flex flex-wrap items-end gap-2.5">
      <label class="flex min-w-[220px] max-w-[360px] flex-1 flex-col gap-1.5">
        <span class="text-[13px] font-semibold text-ink">Portée</span>
        <select
          v-model="scope"
          class="h-11 min-w-0 cursor-pointer rounded-2 border border-line-strong bg-surface px-3 text-sm font-semibold text-ink transition-colors duration-120 ease-out hover:border-ink-3"
          @change="onScope"
        >
          <option value="all">Tous les joueurs</option>
          <option v-for="option in scopeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>
      <AdminButton size="lg" icon="lucide:rotate-cw" :busy="busy" @click="recompute">
        {{ busy ? 'Recalcul…' : 'Recalculer' }}
      </AdminButton>
      <AdminRoute class="self-center">POST /lol/Match/rank-changes/recompute?playerId</AdminRoute>
    </div>

    <AdminResult v-if="error" tone="error">{{ error }}</AdminResult>

    <div v-if="figures.length" class="grid grid-cols-2 gap-2.5 md:grid-cols-3 min-[73.75rem]:grid-cols-5">
      <div v-for="figure in figures" :key="figure.label" class="flex flex-col gap-1.5 rounded-3 p-3.5" :class="figure.tone">
        <span class="fig text-[32px]">{{ figure.value }}</span>
        <span class="text-xs text-ink-2">{{ figure.label }}</span>
      </div>
    </div>
  </div>
</template>
