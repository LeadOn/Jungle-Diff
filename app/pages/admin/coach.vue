<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { LoLCoachReportDto } from '~/lib/types'
import type { LoLCoachResponse } from '~/lib/api/GameOnClient'
import { isCoachQueued } from '~/lib/api/GameOnClient'
import { useAdminStore, coachRequestKey } from '~/stores/admin'
import type { AdminCoachRequest } from '~/stores/admin'
import { usePlayerStore } from '~/stores/player'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { useNow } from '~/composables/useNow'
import { errorStatusCode, isAbortError } from '~/lib/types/error'
import { formatCoachWait } from '~/utils/lol-coach'
import { decimalLabel, formatDateTime } from '~/utils/lol-match'
import { accountRiotId, adminErrorMessage, isMatchId, normalizeMatchId, sortAccounts } from '~/utils/lol-admin'
import AdminSectionHeader from '~/components/admin/AdminSectionHeader.vue'
import AdminButton from '~/components/admin/AdminButton.vue'
import AdminRoute from '~/components/admin/AdminRoute.vue'

useSeoMeta({ title: 'rAImmus · Administration' })

const admin = useAdminStore()
const playerStore = usePlayerStore()
const api = useGameOnLol()
const now = useNow(1000)

/** Fast enough to feel live, slow enough to stay negligible against a ~50 s generation. */
const POLL_INTERVAL_MS = 5000

/**
 * A regeneration is only visible through `generatedOn` changing, and an abandoned one leaves no
 * trace at all: past this delay without a new report, polling stops and the card says so.
 */
const stallAfterMs = (request: AdminCoachRequest) => Math.max(request.initialWaitSeconds * 3, 300) * 1000

const matchId = ref('')
const playerId = ref<number | null>(null)

const playerOptions = computed(() => sortAccounts(admin.accounts.filter(account => !account.archived))
  .map(account => ({ value: account.id, label: accountRiotId(account) })))

// The viewer's own account first, as the mock-up does; any account otherwise.
watch([playerOptions, () => playerStore.currentPlayer?.id], ([options, currentId]) => {
  if (playerId.value !== null || options.length === 0) return
  playerId.value = options.find(option => option.value === currentId)?.value ?? options[0]?.value ?? null
}, { immediate: true })

const isValidMatch = computed(() => isMatchId(matchId.value))
const showFormatHint = computed(() => matchId.value.trim() !== '' && !isValidMatch.value)

const currentKey = computed(() => (isValidMatch.value && playerId.value !== null
  ? coachRequestKey(normalizeMatchId(matchId.value), playerId.value)
  : null))

const tracked = computed(() => admin.coachRequests.find(request => request.key === currentKey.value))

/** What the last "Vérifier l'état" read, for the pair it was read for. */
type CheckResult =
  | { kind: 'report', report: LoLCoachReportDto }
  | { kind: 'none' }
  | { kind: 'error', text: string }

const check = ref<{ key: string, result: CheckResult } | null>(null)
const checkResult = computed(() => (check.value && check.value.key === currentKey.value ? check.value.result : null))

const playerLabel = (id: number) => {
  const account = admin.accountById(id)
  return account ? accountRiotId(account) : `#${id}`
}

/** GETs are dropped when the section is left; the queue itself keeps going upstream. */
const reads = new AbortController()
let pollTimer: ReturnType<typeof setInterval> | null = null
let isPolling = false

/**
 * Applies a `GET` answer to a tracked request. Shared by the poll and by "Vérifier l'état", which
 * may be what notices a regeneration finished after the poll gave up on it.
 */
const applyRead = (request: AdminCoachRequest, response: LoLCoachResponse) => {
  if (isCoachQueued(response)) {
    // Re-read on every tick: the estimate is a rolling average and moves between polls.
    admin.updateCoachRequest(request.key, {
      state: 'queued',
      queue: response,
      initialWaitSeconds: Math.max(request.initialWaitSeconds, response.estimatedWaitSeconds),
    })
    return
  }

  // During a regeneration `GET` keeps serving the report being replaced: that is not the answer.
  if (request.forced && response.generatedOn === request.replacing) {
    if (request.state === 'queued' && Date.now() - request.requestedAt > stallAfterMs(request)) {
      admin.updateCoachRequest(request.key, { state: 'stalled' })
    }
    return
  }

  if (request.state !== 'done') {
    admin.toast(request.forced ? 'Rapport rAImmus régénéré' : 'Rapport rAImmus prêt')
  }
  admin.updateCoachRequest(request.key, { state: 'done', report: response, queue: null })
}

const pollOnce = async () => {
  const queued = admin.coachRequests.filter(request => request.state === 'queued')
  if (isPolling || queued.length === 0) return
  isPolling = true
  try {
    await Promise.all(queued.map(async (request) => {
      try {
        applyRead(request, await api.getCoachReport(request.matchId, request.playerId, reads.signal))
      } catch (error) {
        if (isAbortError(error)) return
        // The slot existed a few seconds ago: a 404 now means the API gave up on it (five refusals
        // from the model in a row), not that nobody asked. Shown as such, or the admin re-clicks.
        if (errorStatusCode(error) === 404) {
          admin.updateCoachRequest(request.key, { state: 'abandoned', queue: null })
          admin.toast(`rAImmus a abandonné l'analyse de ${request.playerLabel}`, 'error')
          return
        }
        // Anything else is taken as transient: the next tick retries.
        console.error('[admin] Coach poll failed:', error)
      }
    }))
  } finally {
    isPolling = false
  }
}

onMounted(() => {
  pollTimer = setInterval(pollOnce, POLL_INTERVAL_MS)
})

// An interval outliving the section would keep polling the API for a view nobody is looking at.
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  reads.abort()
})

const checkBusy = computed(() => admin.isBusy('coach-check'))
const launchBusy = computed(() => admin.isBusy('coach-launch'))

const checkState = async () => {
  const key = currentKey.value
  if (!key || playerId.value === null) return
  const match = normalizeMatchId(matchId.value)
  const player = playerId.value

  await admin.runExclusive('coach-check', async () => {
    try {
      const response = await api.getCoachReport(match, player, reads.signal)
      const request = admin.coachRequests.find(entry => entry.key === key)

      if (isCoachQueued(response)) {
        // Someone else's request (or one from before a reload): follow it like one of ours.
        if (request) applyRead(request, response)
        else {
          admin.upsertCoachRequest({
            key,
            matchId: match,
            playerId: player,
            playerLabel: playerLabel(player),
            forced: false,
            replacing: null,
            state: 'queued',
            queue: response,
            initialWaitSeconds: response.estimatedWaitSeconds,
            requestedAt: Date.now(),
            report: null,
          })
        }
        check.value = null
        return
      }

      if (request) applyRead(request, response)
      check.value = { key, result: { kind: 'report', report: response } }
    } catch (error) {
      if (isAbortError(error)) return
      // On a first read, 404 is the nominal "nobody asked for it yet".
      if (errorStatusCode(error) === 404) {
        check.value = { key, result: { kind: 'none' } }
        return
      }
      console.error('[admin] Coach state read failed:', error)
      check.value = { key, result: { kind: 'error', text: adminErrorMessage(error, 'L\'état de l\'analyse n\'a pas pu être lu.') } }
    }
  })
}

/** Asks for the analysis, or with `force` for a new one over the stored report. */
const launch = async (force: boolean) => {
  const key = currentKey.value
  if (!key || playerId.value === null) return
  const match = normalizeMatchId(matchId.value)
  const player = playerId.value
  const replacing = force
    ? (tracked.value?.report?.generatedOn ?? (checkResult.value?.kind === 'report' ? checkResult.value.report.generatedOn : tracked.value?.replacing ?? null))
    : null

  await admin.runExclusive('coach-launch', async () => {
    try {
      const response = force
        ? await api.regenerateCoachReport(match, player, admin.signal())
        : await api.generateCoachReport(match, player, admin.signal())

      if (!isCoachQueued(response)) {
        // Already stored (a plain request never regenerates): nothing was queued.
        check.value = { key, result: { kind: 'report', report: response } }
        return
      }

      admin.upsertCoachRequest({
        key,
        matchId: match,
        playerId: player,
        playerLabel: playerLabel(player),
        forced: force,
        replacing,
        state: 'queued',
        queue: response,
        initialWaitSeconds: Math.max(response.estimatedWaitSeconds, 1),
        requestedAt: Date.now(),
        report: null,
      })
      check.value = null
      admin.toast(`202 · Analyse mise en file, position ${response.position} sur ${response.queueLength}`)
    } catch (error) {
      if (isAbortError(error)) return
      console.error('[admin] Coach request failed:', error)
      check.value = {
        key,
        result: {
          kind: 'error',
          text: errorStatusCode(error) === 404
            ? '404 · L\'API ne connaît pas cette partie, ou ce joueur n\'y a pas joué.'
            : adminErrorMessage(error, 'La demande d\'analyse a échoué.'),
        },
      }
    }
  })
}

type Tone = 'report' | 'none' | 'queued' | 'error'

const TONES: Record<Tone, { card: string, code: string }> = {
  report: { card: 'bg-win-soft', code: 'text-brand-green' },
  none: { card: 'bg-surface-muted', code: 'text-text-sec' },
  queued: { card: 'bg-surface-highlight', code: 'text-brand-gold' },
  error: { card: 'bg-loss-soft', code: 'text-brand-red' },
}

interface StatusCard {
  tone: Tone
  code: string
  title: string
  text: string
  progress: number | null
  action: { label: string, force: boolean, route: string } | null
  report: LoLCoachReportDto | null
}

const reportText = (report: LoLCoachReportDto) =>
  `Note de rAImmus : ${decimalLabel(report.analysis.noteSur10, 1)}/10 · écrit le ${formatDateTime(report.generatedOn)}. Régénérer écrase ce rapport et rappelle le modèle.`

const REGENERATE = { label: 'Régénérer', force: true, route: 'POST /lol/Coach/{matchId}/player/{playerId}?force=true' }

const status = computed<StatusCard | null>(() => {
  const request = tracked.value
  if (request && request.state === 'queued') {
    const elapsed = now.value ? Math.max(0, (now.value - request.requestedAt) / 1000) : 0
    // Only a plain request gets fresh estimates from the poll; a regeneration keeps the POST's and
    // counts down from it.
    const wait = request.forced
      ? Math.max(0, request.initialWaitSeconds - elapsed)
      : request.queue?.estimatedWaitSeconds ?? request.initialWaitSeconds
    const position = request.forced ? null : request.queue?.position ?? null
    const title = position === null
      ? 'Régénération en cours'
      : position <= 1 ? 'Génération en cours' : `En file · position ${position} sur ${request.queue?.queueLength ?? position}`
    return {
      tone: 'queued',
      code: '202',
      title,
      text: request.forced
        ? `Temps estimé ${formatCoachWait(wait)} à l'envoi. Pendant une régénération, l'API sert encore l'ancien rapport : la page guette le nouveau toutes les 5 s.`
        : `Temps estimé ${formatCoachWait(wait)} (moyenne des 10 dernières générations). La page interroge l'API toutes les 5 s.`,
      progress: Math.min(0.97, Math.max(0.03, 1 - wait / Math.max(request.initialWaitSeconds, 1))),
      action: null,
      report: null,
    }
  }
  if (request && request.state === 'done' && request.report) {
    return {
      tone: 'report',
      code: '200',
      title: request.forced ? 'Rapport régénéré' : 'Rapport prêt',
      text: reportText(request.report),
      progress: null,
      action: REGENERATE,
      report: request.report,
    }
  }
  if (request && request.state === 'abandoned') {
    return {
      tone: 'error',
      code: '404',
      title: 'Génération abandonnée',
      text: 'L\'API a renoncé après cinq refus consécutifs du modèle. Relancer remet l\'analyse en file.',
      progress: null,
      action: { label: 'Relancer', force: request.forced, route: request.forced ? REGENERATE.route : 'POST /lol/Coach/{matchId}/player/{playerId}' },
      report: null,
    }
  }
  if (request && request.state === 'stalled') {
    const minutes = Math.round(stallAfterMs(request) / 60_000)
    return {
      tone: 'queued',
      code: '200',
      title: 'Toujours l\'ancien rapport',
      text: `Aucun nouveau rapport après ${minutes} min : la régénération a peut-être été abandonnée, l'API n'en garde pas trace. Vérifiez l'état à nouveau, ou relancez.`,
      progress: null,
      action: REGENERATE,
      report: null,
    }
  }

  const result = checkResult.value
  if (!result) return null
  if (result.kind === 'report') {
    return { tone: 'report', code: '200', title: 'Rapport existant', text: reportText(result.report), progress: null, action: REGENERATE, report: result.report }
  }
  if (result.kind === 'none') {
    return {
      tone: 'none',
      code: '404',
      title: 'Aucune analyse demandée',
      text: 'Personne n\'a encore demandé cette analyse. La lancer la met en file.',
      progress: null,
      action: { label: 'Lancer l\'analyse', force: false, route: 'POST /lol/Coach/{matchId}/player/{playerId}' },
      report: null,
    }
  }
  return { tone: 'error', code: '—', title: 'Échec', text: result.text, progress: null, action: null, report: null }
})

const REQUEST_CHIPS: Record<AdminCoachRequest['state'], { label: string, tone: string }> = {
  queued: { label: 'En file', tone: 'bg-brand-gold-soft text-brand-gold' },
  done: { label: 'Rapport prêt', tone: 'bg-win-soft text-brand-green' },
  abandoned: { label: 'Abandonnée', tone: 'bg-loss-soft text-brand-red' },
  stalled: { label: 'Sans nouvelles', tone: 'bg-surface-high text-text-sec' },
}

/** A request of the list puts its pair back in the form. */
const select = (request: AdminCoachRequest) => {
  matchId.value = request.matchId
  playerId.value = request.playerId
}

const onFormChange = () => {
  check.value = null
}
</script>

<template>
  <section aria-labelledby="admin-coach-title" class="animate-rise">
    <AdminSectionHeader
      heading-id="admin-coach-title"
      title="rAImmus"
      description="Consulter l'état d'une analyse et forcer sa régénération. Réservé aux admins : le rapport existant est écrasé et le modèle est rappelé."
    />

    <div class="grid items-start gap-5 min-[73.75rem]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div class="flex flex-col gap-3.5 rounded-3xl border border-border-subtle bg-surface-base p-[22px] shadow-card">
        <div class="grid gap-2.5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <label class="flex flex-col gap-1.5">
            <span class="text-[12.5px] font-bold">Identifiant de partie</span>
            <input
              v-model="matchId"
              placeholder="EUW1_7234519822"
              spellcheck="false"
              autocomplete="off"
              class="h-11 rounded-[14px] border bg-surface-hover px-3.5 font-mono text-sm text-text-main outline-none transition-colors focus:border-text-main/45"
              :class="showFormatHint ? 'border-brand-red/50' : 'border-border-accent'"
              @input="onFormChange"
              @keydown.enter.prevent="checkState"
            >
            <span v-if="showFormatHint" class="text-xs font-semibold text-brand-red">Format attendu : EUW1_ suivi de l'identifiant numérique.</span>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-[12.5px] font-bold">Joueur</span>
            <select
              v-model="playerId"
              class="h-11 rounded-[14px] border border-border-accent bg-surface-hover px-3 text-sm font-semibold text-text-main outline-none focus:border-text-main/45"
              @change="onFormChange"
            >
              <option v-for="option in playerOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <AdminButton variant="secondary" size="lg" :busy="checkBusy" :disabled="!currentKey" @click="checkState">
            {{ checkBusy ? 'Vérification…' : 'Vérifier l\'état' }}
          </AdminButton>
          <AdminRoute>GET /lol/Coach/{matchId}/player/{playerId}</AdminRoute>
        </div>

        <div v-if="status" class="flex flex-col gap-3 rounded-[18px] p-4" :class="TONES[status.tone].card">
          <span class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-surface-base px-2.5 py-[3px] font-mono text-[11.5px] font-semibold" :class="TONES[status.tone].code">{{ status.code }}</span>
            <span class="text-[15px] font-bold">{{ status.title }}</span>
          </span>
          <span class="text-[13px] font-semibold text-pretty text-text-main/80">{{ status.text }}</span>
          <span
            v-if="status.progress !== null"
            role="progressbar"
            aria-label="Avancement estimé"
            :aria-valuenow="Math.round(status.progress * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
            class="block h-1.5 overflow-hidden rounded-full bg-text-main/10"
          >
            <span class="block h-full rounded-full bg-win transition-[width] duration-1000 ease-linear" :style="{ width: `${Math.round(status.progress * 100)}%` }" />
          </span>
          <div v-if="status.action || status.report" class="flex flex-wrap items-center gap-2.5">
            <AdminButton v-if="status.action" :busy="launchBusy" @click="launch(status.action.force)">
              {{ launchBusy ? 'Envoi…' : status.action.label }}
            </AdminButton>
            <NuxtLink
              v-if="status.report && status.report.playerId !== null"
              :to="`/game/${encodeURIComponent(status.report.matchId)}/${status.report.playerId}`"
              class="text-[13px] font-bold text-brand-link underline-offset-2 hover:underline"
            >
              Lire le rapport
            </NuxtLink>
            <AdminRoute v-if="status.action">{{ status.action.route }}</AdminRoute>
          </div>
        </div>
      </div>

      <div class="rounded-3xl border border-border-subtle bg-surface-base p-5 shadow-card">
        <h2 class="m-0 text-xl font-bold tracking-[-0.025em]">Demandes de cette session</h2>
        <p class="mb-2 mt-[3px] text-[12.5px] font-semibold text-pretty text-text-sec">L'API ne liste pas la file : seules les demandes faites depuis cette page sont suivies ici.</p>
        <button
          v-for="request in admin.coachRequests"
          :key="request.key"
          type="button"
          class="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-t border-dashed border-border-dashed py-2.5 text-left"
          @click="select(request)"
        >
          <span class="flex min-w-0 flex-col gap-px">
            <span class="text-[13.5px] font-bold">{{ request.playerLabel }}</span>
            <span class="truncate font-mono text-[11px] text-text-sec">{{ request.matchId }}</span>
          </span>
          <span class="whitespace-nowrap rounded-full px-[9px] py-[3px] text-[11.5px] font-bold" :class="REQUEST_CHIPS[request.state].tone">
            {{ REQUEST_CHIPS[request.state].label }}
          </span>
        </button>
        <p v-if="admin.coachRequests.length === 0" class="m-0 border-t border-dashed border-border-dashed pb-1 pt-3.5 text-[13.5px] font-semibold text-text-sec">
          Aucune analyse demandée.
        </p>
      </div>
    </div>
  </section>
</template>
