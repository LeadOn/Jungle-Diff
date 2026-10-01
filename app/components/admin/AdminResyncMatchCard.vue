<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAdminStore } from '~/stores/admin'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { errorStatusCode, isAbortError } from '~/lib/types/error'
import { adminErrorMessage, isMatchId, normalizeMatchId } from '~/utils/lol-admin'
import AdminButton from './AdminButton.vue'
import AdminResult from './AdminResult.vue'
import AdminRoute from './AdminRoute.vue'

/** Re-reads a stored match and its timeline from Riot (`POST /lol/match/{id}/update`). */
const admin = useAdminStore()
const api = useGameOnLol()

const matchId = ref('')
const result = ref<{ ok: boolean, text: string } | null>(null)

const busy = computed(() => admin.isBusy('match-resync'))
const isValid = computed(() => isMatchId(matchId.value))
const showFormatHint = computed(() => matchId.value.trim() !== '' && !isValid.value)

const resync = async () => {
  if (!isValid.value) return
  const id = normalizeMatchId(matchId.value)
  result.value = null

  await admin.runExclusive('match-resync', async () => {
    try {
      await api.refreshGame(id, admin.signal())
      result.value = { ok: true, text: `204 · ${id} relue depuis Riot.` }
    } catch (error) {
      if (isAbortError(error)) return
      console.error('[admin] Match resync failed:', error)
      // The API throws on a match it does not store and on one Riot does not serve, and both
      // surface as a 500: say what it usually means rather than "server error".
      result.value = {
        ok: false,
        text: errorStatusCode(error) === 500
          ? `500 · ${id} n'est pas en base, ou Riot ne la sert pas (une partie personnalisée s'importe ci-contre).`
          : adminErrorMessage(error, `La re-synchronisation de ${id} a échoué.`),
      }
    }
  })
}

const onInput = () => { result.value = null }
</script>

<template>
  <div class="flex flex-col gap-3.5 rounded-3xl border border-border-subtle bg-surface-base p-[22px] shadow-card">
    <div>
      <h2 class="m-0 text-[17px] font-bold">Re-synchroniser une partie</h2>
      <p class="mt-1 text-[13px] font-semibold leading-normal text-pretty text-text-sec">Relit la partie et sa timeline depuis Riot.</p>
    </div>

    <label class="flex flex-col gap-1.5">
      <span class="text-[12.5px] font-bold">Identifiant de partie</span>
      <input
        v-model="matchId"
        placeholder="EUW1_7234519822"
        spellcheck="false"
        autocomplete="off"
        class="h-11 rounded-[14px] border bg-surface-hover px-3.5 font-mono text-sm text-text-main outline-none transition-colors focus:border-text-main/45"
        :class="showFormatHint || (result && !result.ok) ? 'border-brand-red/50' : 'border-border-accent'"
        @input="onInput"
        @keydown.enter.prevent="resync"
      >
      <span v-if="showFormatHint" class="text-xs font-semibold text-brand-red">Format attendu : EUW1_ suivi de l'identifiant numérique.</span>
    </label>

    <AdminResult v-if="result" :tone="result.ok ? 'success' : 'error'">{{ result.text }}</AdminResult>

    <div class="mt-auto flex flex-wrap items-center gap-2.5">
      <AdminButton size="lg" icon="lucide:rotate-cw" :busy="busy" :disabled="!isValid" @click="resync">
        {{ busy ? 'Re-synchronisation…' : 'Re-synchroniser' }}
      </AdminButton>
      <AdminRoute>POST /lol/Match/{matchId}/update</AdminRoute>
    </div>
  </div>
</template>
