import type { LoLAdminAccountDto } from '~/lib/types'
import { AppError, errorStatusCode } from '~/lib/types/error'
import { isSmurf } from '~/utils/lol-smurf'
import { normalizeSearchText } from '~/utils/player-search'
import { parseApiDate } from '~/utils/lol-match'

/**
 * Helpers of the admin space: how an account is classified, filtered and ordered, and how the
 * admin routes' failures are worded.
 */

export type AdminAccountFilter = 'crew' | 'smurf' | 'out' | 'archived' | 'all'

export const ADMIN_ACCOUNT_FILTERS: ReadonlyArray<{ value: AdminAccountFilter, label: string }> = [
  { value: 'crew', label: 'Crew' },
  { value: 'smurf', label: 'Smurfs' },
  { value: 'out', label: 'Hors crew' },
  { value: 'archived', label: 'Archivés' },
  { value: 'all', label: 'Tous' },
]

export function isAdminAccountFilter(value: unknown): value is AdminAccountFilter {
  return ADMIN_ACCOUNT_FILTERS.some(filter => filter.value === value)
}

/**
 * The filters overlap on purpose, like the mock-up's counters: a smurf in the crew counts under
 * "Crew" and under "Smurfs". An archived account only ever counts under "Archivés".
 */
export function matchesAccountFilter(account: LoLAdminAccountDto, filter: AdminAccountFilter): boolean {
  switch (filter) {
    case 'crew': return !account.archived && account.inCrew
    case 'smurf': return !account.archived && isSmurf(account)
    case 'out': return !account.archived && !account.inCrew
    case 'archived': return account.archived
    default: return true
  }
}

export function countAccounts(accounts: LoLAdminAccountDto[]): Record<AdminAccountFilter, number> {
  const counts: Record<AdminAccountFilter, number> = { crew: 0, smurf: 0, out: 0, archived: 0, all: 0 }
  for (const account of accounts) {
    for (const { value } of ADMIN_ACCOUNT_FILTERS) {
      if (matchesAccountFilter(account, value)) counts[value]++
    }
  }
  return counts
}

export type AccountStatus = 'crew' | 'out' | 'archived'

/** Where an account stands, one answer only: archived wins over crew membership. */
export function accountStatus(account: Pick<LoLAdminAccountDto, 'archived' | 'inCrew'>): AccountStatus {
  if (account.archived) return 'archived'
  return account.inCrew ? 'crew' : 'out'
}

export const ACCOUNT_STATUS_CHIPS: Record<AccountStatus, { label: string, tone: string }> = {
  crew: { label: 'Crew', tone: 'bg-win-soft text-brand-green' },
  out: { label: 'Hors crew', tone: 'bg-brand-gold-soft text-brand-gold' },
  archived: { label: 'Archivé', tone: 'bg-surface-high text-text-sec' },
}

/** An account with a Keycloak user: its owner has signed in at least once. Smurfs never have one. */
export function hasKeycloakUser(account: Pick<LoLAdminAccountDto, 'keycloakId'>): boolean {
  return !!account.keycloakId
}

/** The Riot ID an account is shown under, falling back on the GameOn nickname when it has none. */
export function accountRiotName(account: Pick<LoLAdminAccountDto, 'riotGamesNickname' | 'nickname'>): string {
  return account.riotGamesNickname || account.nickname
}

export function accountRiotId(account: Pick<LoLAdminAccountDto, 'riotGamesNickname' | 'riotGamesTagLine' | 'nickname'>): string {
  const tag = account.riotGamesTagLine
  return tag ? `${accountRiotName(account)}#${tag}` : accountRiotName(account)
}

/** Whether two Riot IDs are the same account. Riot compares them case-insensitively. */
export function sameRiotId(
  a: { name: string | null, tag: string | null },
  b: { name: string | null, tag: string | null },
): boolean {
  const norm = (value: string | null) => (value ?? '').trim().toLowerCase()
  return norm(a.name) === norm(b.name) && norm(a.tag) === norm(b.tag)
}

/** Minutes since the account was last read from Riot, `Infinity` when it never was. */
export function minutesSinceSync(account: Pick<LoLAdminAccountDto, 'lolRefreshedOn'>, now: number): number {
  if (!account.lolRefreshedOn) return Number.POSITIVE_INFINITY
  return Math.max(0, (now - parseApiDate(account.lolRefreshedOn).getTime()) / 60_000)
}

/** Past a day without a sync, an account is flagged: the crew's own job runs every 20 minutes. */
export const STALE_SYNC_MINUTES = 24 * 60

/** The accounts read from Riot the longest ago, never-synced ones first. */
export function staleAccounts(accounts: LoLAdminAccountDto[], now: number, count = 4): LoLAdminAccountDto[] {
  return [...accounts]
    .sort((a, b) => minutesSinceSync(b, now) - minutesSinceSync(a, now))
    .slice(0, count)
}

/**
 * Orders the account table: crew, then out of the crew, then archived; alphabetical inside each
 * group, every smurf listed right under its main so an account and its secondaries read together.
 */
export function sortAccounts(accounts: LoLAdminAccountDto[]): LoLAdminAccountDto[] {
  const byId = new Map(accounts.map(account => [account.id, account]))
  const group = (account: LoLAdminAccountDto) => (account.archived ? 2 : account.inCrew ? 0 : 1)
  const familyName = (account: LoLAdminAccountDto) => {
    const main = isSmurf(account) ? byId.get(account.primaryPlayerId ?? -1) : undefined
    return normalizeSearchText(accountRiotName(main ?? account))
  }
  const ownName = (account: LoLAdminAccountDto) => normalizeSearchText(accountRiotName(account))

  return [...accounts].sort((a, b) =>
    group(a) - group(b)
    || familyName(a).localeCompare(familyName(b))
    || Number(isSmurf(a)) - Number(isSmurf(b))
    || ownName(a).localeCompare(ownName(b)))
}

/** Filter, then free-text search over the Riot ID, the GameOn nickname and the full name. */
export function filterAccounts(accounts: LoLAdminAccountDto[], filter: AdminAccountFilter, query: string): LoLAdminAccountDto[] {
  const needle = normalizeSearchText(query)
  return accounts.filter((account) => {
    if (!matchesAccountFilter(account, filter)) return false
    if (!needle) return true
    const haystack = [accountRiotId(account), account.nickname, account.fullName ?? ''].map(normalizeSearchText).join(' ')
    return haystack.includes(needle)
  })
}

const MATCH_ID_PATTERN = /^[A-Z0-9]+_\d{6,}$/

/** Match ids are stored upper-case (`EUW1_7234519822`); people paste them in every case. */
export function normalizeMatchId(value: string): string {
  return value.trim().toUpperCase()
}

export function isMatchId(value: string): boolean {
  return MATCH_ID_PATTERN.test(normalizeMatchId(value))
}

/**
 * Wording for the failures every admin route shares. `fallback` covers whatever is specific to
 * the route (a 404, a 409, a 500 the API throws on a missing record) and is worded by the caller.
 */
export function adminErrorMessage(error: unknown, fallback: string): string {
  const code = errorStatusCode(error)
  if (code === 401) return 'Session expirée : reconnectez-vous puis recommencez.'
  if (code === 403) return 'L\'API refuse : cette action demande le rôle gameon_admin.'
  if (code === 0) return 'L\'API n\'a pas répondu.'
  if (code === 502) return 'L\'API est injoignable.'
  if (code === 504) return 'L\'API a mis plus de deux minutes à répondre.'
  return fallback
}

/**
 * `POST /lol/summoner/{id}/smurfs` answers its refusals with a plain English sentence: two distinct
 * 404s and two distinct 409s. The sentence is read only to tell them apart; the wording is ours.
 */
export function linkSmurfErrorMessage(error: unknown): string {
  const code = errorStatusCode(error)
  const details = error instanceof AppError && typeof error.details === 'string' ? error.details : ''
  if (code === 404) {
    if (details.includes('Riot')) return '404 · Compte Riot introuvable.'
    if (details.includes('Player')) return '404 · Compte principal introuvable.'
    return '404 · Compte Riot ou compte principal introuvable.'
  }
  if (code === 409) {
    if (details.includes('already a smurf')) return '409 · Ce compte est lui-même un smurf : liez plutôt à son compte principal.'
    return '409 · Ce compte Riot est déjà utilisé par un autre joueur : déliez-le d\u2019abord.'
  }
  return adminErrorMessage(error, 'La liaison a échoué.')
}
