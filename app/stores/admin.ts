import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { LoLAdminAccountDto, LoLCoachQueueStatusDto, LoLCoachReportDto } from '~/lib/types'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { isAbortError } from '~/lib/types/error'
import { accountRiotName, adminErrorMessage, countAccounts } from '~/utils/lol-admin'

export type AdminLoadStatus = 'idle' | 'pending' | 'success' | 'error'

/**
 * A coach analysis asked for from the admin space. The API cannot list its queue, so these are the
 * only requests the page can follow: the ones it made itself during this visit.
 */
export interface AdminCoachRequest {
  key: string
  matchId: string
  playerId: number
  playerLabel: string
  /** A regeneration (`force=true`) of a report that already existed. */
  forced: boolean
  /**
   * `generatedOn` of the report being replaced. While a regeneration waits, `GET` keeps serving
   * that old report with a `200`, so the regeneration is over when it serves another one.
   */
  replacing: string | null
  state: 'queued' | 'done' | 'abandoned' | 'stalled'
  /** The latest slot read, from the `POST` or a poll. A regeneration only ever has the `POST`'s. */
  queue: LoLCoachQueueStatusDto | null
  /** The largest wait seen, the progress bar's full length. */
  initialWaitSeconds: number
  requestedAt: number
  report: LoLCoachReportDto | null
}

export interface AdminToast {
  message: string
  tone: 'success' | 'error'
}

export const coachRequestKey = (matchId: string, playerId: number) => `${matchId}:${playerId}`

const TOAST_DURATION_MS = 3800

/**
 * State of the admin space, shared by its four sections.
 *
 * Accounts are read on the client only, after mount: the page is per-user and never cached, and
 * the API calls need the session the proxy attaches. Every write re-reads the list rather than
 * patching it by hand, since one write moves several accounts at once (a main leaving the crew takes
 * its smurfs along) and the list route is the one that knows ranks.
 */
export const useAdminStore = defineStore('admin', () => {
  const api = useGameOnLol()

  const accounts = ref<LoLAdminAccountDto[]>([])
  const loadStatus = ref<AdminLoadStatus>('idle')
  const loadError = ref<string | null>(null)

  /** Actions in flight, by key (`refresh:12`, `ranks`…), so a button cannot fire twice. */
  const busy = ref<Record<string, boolean>>({})
  const toastState = ref<AdminToast | null>(null)
  const coachRequests = ref<AdminCoachRequest[]>([])

  const counts = computed(() => countAccounts(accounts.value))

  /** Cancelled when the admin space is left, so no late answer writes into it afterwards. */
  let session = new AbortController()
  let listRequest: AbortController | null = null
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  const signal = () => session.signal

  const accountById = (id: number | null | undefined) =>
    id == null ? undefined : accounts.value.find(account => account.id === id)

  /**
   * Every account: the active ones (crew or not) and the archived ones, which the API only serves
   * one `archived` value at a time. `silent` keeps the current list on screen while it reloads.
   */
  const fetchAccounts = async ({ silent = false }: { silent?: boolean } = {}): Promise<void> => {
    listRequest?.abort()
    const controller = new AbortController()
    listRequest = controller
    const abortWithSession = () => controller.abort()
    session.signal.addEventListener('abort', abortWithSession, { once: true })

    if (!silent || accounts.value.length === 0) loadStatus.value = 'pending'
    try {
      const [active, archived] = await Promise.all([
        api.getAdminAccounts(false, controller.signal),
        api.getAdminAccounts(true, controller.signal),
      ])
      accounts.value = [...active, ...archived]
      loadStatus.value = 'success'
      loadError.value = null
    } catch (error) {
      if (isAbortError(error)) return
      console.error('[admin] Account list unavailable:', error)
      if (silent && accounts.value.length > 0) {
        toast('La liste des comptes n\'a pas pu être relue.', 'error')
        return
      }
      loadStatus.value = 'error'
      loadError.value = adminErrorMessage(error, 'La liste des comptes n\'a pas pu être chargée.')
    } finally {
      session.signal.removeEventListener('abort', abortWithSession)
      if (listRequest === controller) listRequest = null
    }
  }

  const isBusy = (key: string) => busy.value[key] === true

  /**
   * Runs `task` under `key`, once at a time. Resolves to `undefined` without running it when the
   * same action is already in flight.
   */
  const runExclusive = async <T>(key: string, task: () => Promise<T>): Promise<T | undefined> => {
    if (isBusy(key)) return undefined
    busy.value = { ...busy.value, [key]: true }
    try {
      return await task()
    } finally {
      busy.value = Object.fromEntries(Object.entries(busy.value).filter(([entry]) => entry !== key))
    }
  }

  const toast = (message: string, tone: AdminToast['tone'] = 'success') => {
    if (!import.meta.client) return
    toastState.value = { message, tone }
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toastState.value = null }, TOAST_DURATION_MS)
  }

  /** `PATCH /lol/summoner/{id}`: re-reads one account from Riot. Anonymous upstream. */
  const refreshAccount = async (id: number): Promise<void> => {
    const name = accountRiotName(accountById(id) ?? { riotGamesNickname: null, nickname: `#${id}` })
    await runExclusive(`refresh:${id}`, async () => {
      try {
        await api.refreshPlayer(id, signal())
        toast(`${name} rafraîchi depuis Riot`)
        await fetchAccounts({ silent: true })
      } catch (error) {
        if (isAbortError(error)) return
        console.error('[admin] Account refresh failed:', error)
        toast(adminErrorMessage(error, `Le rafraîchissement de ${name} a échoué.`), 'error')
      }
    })
  }

  const upsertCoachRequest = (request: AdminCoachRequest) => {
    coachRequests.value = [request, ...coachRequests.value.filter(entry => entry.key !== request.key)]
  }

  const updateCoachRequest = (key: string, patch: Partial<AdminCoachRequest>) => {
    coachRequests.value = coachRequests.value.map(entry => (entry.key === key ? { ...entry, ...patch } : entry))
  }

  /** Leaving the admin space: whatever is still in flight has nobody left to answer to. */
  const dispose = () => {
    session.abort()
    session = new AbortController()
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = null
    toastState.value = null
  }

  return {
    accounts,
    loadStatus,
    loadError,
    busy,
    toastState,
    coachRequests,
    counts,
    signal,
    accountById,
    fetchAccounts,
    isBusy,
    runExclusive,
    toast,
    refreshAccount,
    upsertCoachRequest,
    updateCoachRequest,
    dispose,
  }
})
