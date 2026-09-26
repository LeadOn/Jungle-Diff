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
    { value: String(run.participationsScanned), label: 'participations lues', tone: 'bg-surface-hover text-text-main' },
    { value: String(run.participationsWithRankChange), label: 'avec LP attribués', tone: 'bg-surface-hover text-text-main' },
    { value: `+${run.created}`, label: 'LP écrits', tone: 'bg-win-soft text-brand-green' },
    { value: String(run.updated), label: 'LP corrigés', tone: 'bg-brand-gold-soft text-brand-gold' },
    { value: `−${run.removed}`, label: 'retirés (ambigus)', tone: 'bg-loss-soft text-brand-red' },
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
  <div class="flex flex-col gap-3.5 rounded-3xl border border-border-subtle bg-surface-base p-[22px] shadow-card">
    <div>
      <h2 class="m-0 text-[17px] font-bold">Recalculer les LP par partie</h2>
      <p class="mt-1 text-[13px] font-semibold leading-normal text-pretty text-text-sec">
        Réattribue les LP gagnés ou perdus à chaque partie classée à partir des snapshots de rang. Aucun appel à Riot. Utile après un import tardif ou un changement de règle.
      </p>
    </div>

    <div class="flex flex-wrap items-end gap-2.5">
      <label class="flex min-w-[220px] max-w-[360px] flex-1 flex-col gap-1.5">
        <span class="text-[12.5px] font-bold">Portée</span>
        <select
          v-model="scope"
          class="h-11 rounded-[14px] border border-border-accent bg-surface-hover px-3 text-sm font-semibold text-text-main outline-none focus:border-text-main/45"
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
      <div v-for="figure in figures" :key="figure.label" class="flex flex-col gap-0.5 rounded-2xl p-3.5" :class="figure.tone">
        <span class="text-[28px] font-bold leading-none tracking-[-0.04em]">{{ figure.value }}</span>
        <span class="text-xs font-semibold text-text-sec">{{ figure.label }}</span>
      </div>
    </div>
  </div>
</template>
