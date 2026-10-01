import { BaseApiService, encodePathSegment as segment } from './BaseApiService'
import type { RequestOptions } from './BaseApiService'
import type { LoLQueue, LoLHomeStatsDto, LoLHomeWindow, LoLLiveGameDto, LeaguePlayer, PaginatedMatchResponse, LeagueOfLegendsRank, LoLRankHistoryGranularity, LoLRankChangeEntryDto, LoLRankChangeQueue, LoLStatsPeriod, LoLGameTimelineFrame, LoLGameDto, LoLGlobalStatsDto, LoLCoachReportDto, LoLCoachQueueStatusDto, LoLAdminAccountDto, GameOnPlayerDto, UpdatePlayerDto, LoLSetCrewMembershipResultDto, LoLLinkSmurfAccountResultDto, LoLRecomputeRankChangesResultDto, LoLCustomGameImportPayload, LoLImportCustomGameResultDto } from '../types'

/**
 * What either coach route may answer.
 *
 * Neither one generates during the request any more: the API queues the work behind a single
 * consumer, so a `202` carrying a `LoLCoachQueueStatusDto` is as ordinary as a `200` carrying the
 * report. `$fetch` resolves on both and hands back the body either way.
 */
export type LoLCoachResponse = LoLCoachReportDto | LoLCoachQueueStatusDto

/**
 * Discriminates the two answers by shape.
 *
 * `BaseApiService` deliberately does not surface the status code — the two DTOs share no field, so
 * widening the whole client to carry a status for this one pair of endpoints buys nothing.
 */
export const isCoachQueued = (response: LoLCoachResponse): response is LoLCoachQueueStatusDto =>
  'position' in response

/**
 * GameOn API client.
 *
 * It never targets the API directly but the Nitro proxy at `/api/gameon`, which sets the
 * `Authorization` header from the httpOnly session cookies. No token therefore passes through
 * browser code, and there is no auth header to manage here any more.
 *
 * Every method accepts an `AbortSignal`: callers are expected to pass one so the request is
 * cancelled when the component unmounts or a filter changes.
 */
export class GameOnClient extends BaseApiService {
  private static opts(signal?: AbortSignal): RequestOptions {
    return signal ? { signal } : {}
  }

  /**
   * The home dashboard's pre-aggregated figures. `includeSmurfs` reaches the weekly activity, the
   * fact of the week and the `crewRecords` alike, so one flag moves the whole page. Written only
   * when `false`, like `getGlobalStats`, since the API defaults it to `true`. `includeOutOfCrew` is
   * pinned for the same reason as in `getLeaguePlayers`: the dashboard is the crew's, and that
   * assumption belongs in the call rather than in an upstream default.
   *
   * `window` is written only when it departs from the API's default (`CalendarWeek`), which
   * GameOn-Front still relies on.
   */
  public getHomeStats(includeSmurfs?: boolean, window: LoLHomeWindow = 'CalendarWeek', signal?: AbortSignal) {
    const params = new URLSearchParams({ includeOutOfCrew: 'false' })
    if (includeSmurfs === false) params.set('includeSmurfs', 'false')
    if (window !== 'CalendarWeek') params.set('window', window)
    return this.get<LoLHomeStatsDto>(`/lol/Home?${params.toString()}`, GameOnClient.opts(signal))
  }

  /**
   * Crew members in a game right now. The API answers from a one-minute cache over Riot's
   * spectator-v5, so polling faster than that gains nothing. Same roster flags as `getHomeStats`.
   */
  public getLiveGames(includeSmurfs?: boolean, signal?: AbortSignal) {
    const params = new URLSearchParams({ includeOutOfCrew: 'false' })
    if (includeSmurfs === false) params.set('includeSmurfs', 'false')
    return this.get<LoLLiveGameDto[]>(`/lol/live?${params.toString()}`, GameOnClient.opts(signal))
  }

  public getQueues(signal?: AbortSignal) {
    return this.get<LoLQueue[]>('/lol/queue', GameOnClient.opts(signal))
  }

  public getMatch(matchId: string, signal?: AbortSignal) {
    return this.get<LoLGameDto>(`/lol/match/${segment(matchId)}`, GameOnClient.opts(signal))
  }

  /**
   * The crew's accounts. `includeOutOfCrew=false` is pinned rather than left to the API's default,
   * which happens to agree today: every consumer of this list assumes crew membership — `LolGameCard`
   * uses it to tell a crew participant from an outsider — so the assumption belongs in the call, not
   * in an upstream default that could flip. Smurfs are deliberately NOT filtered here: `LolPlayerHeader`
   * and `LolGameDetailsPlayer` walk this list to climb from a smurf to its main, and the ladder hides
   * them with a view filter of its own.
   */
  public getLeaguePlayers(archived: boolean = false, signal?: AbortSignal) {
    return this.get<LeaguePlayer[]>(`/lol/summoner?archived=${archived}&includeOutOfCrew=false`, GameOnClient.opts(signal))
  }

  public getPlayerById(id: string | number, period?: LoLStatsPeriod, queueIds?: number[] | null, teamPosition?: string, signal?: AbortSignal) {
    const params = new URLSearchParams()
    if (period) params.set('period', period)
    if (queueIds && queueIds.length > 0) params.set('queues', queueIds.join(','))
    if (teamPosition) params.set('teamPosition', teamPosition)
    const query = params.toString()
    return this.get<LeaguePlayer>(`/lol/summoner/${segment(id)}${query ? `?${query}` : ''}`, GameOnClient.opts(signal))
  }

  public getRankHistory(id: string | number, granularity: LoLRankHistoryGranularity, days?: number, signal?: AbortSignal) {
    const params = new URLSearchParams({ granularity })
    if (days != null) params.set('days', String(days))
    return this.get<LeagueOfLegendsRank[]>(`/lol/summoner/${segment(id)}/rank?${params.toString()}`, GameOnClient.opts(signal))
  }

  /** The player's last ranked games with the LP each one moved, oldest first. */
  public getRankChanges(id: string | number, queue: LoLRankChangeQueue, limit: number, days?: number, signal?: AbortSignal) {
    const params = new URLSearchParams({ queue, limit: String(limit) })
    if (days != null) params.set('days', String(days))
    return this.get<LoLRankChangeEntryDto[]>(`/lol/summoner/${segment(id)}/rank/changes?${params.toString()}`, GameOnClient.opts(signal))
  }

  public refreshPlayer(id: string | number, signal?: AbortSignal) {
    return this.patch<LeaguePlayer>(`/lol/summoner/${segment(id)}`, null, GameOnClient.opts(signal))
  }

  public getLastGamesPlayedByPlayer(
    playerId: string | number,
    page: number = 1,
    size: number = 10,
    rankedOnly: boolean = false,
    queueIds?: number[] | null,
    startDate?: string | null,
    endDate?: string | null,
    teamPosition?: string,
    signal?: AbortSignal
  ) {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('size', size.toString())
    params.set('rankedOnly', rankedOnly.toString())

    if (queueIds && queueIds.length > 0) {
      params.set('queues', queueIds.join(','))
    }
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)
    if (teamPosition) params.set('teamPosition', teamPosition)

    return this.get<PaginatedMatchResponse>(`/lol/match/player/${segment(playerId)}?${params.toString()}`, GameOnClient.opts(signal))
  }

  /**
   * The crew's latest games. `includeSmurfs=false` drops a match only when every crew participant in
   * it is a secondary account — a smurf playing alongside a main keeps the game — and the page is
   * refilled with older matches, so a page of `size` stays a page of `size`. That refill is why this
   * is worth asking the API rather than filtering the page client side.
   */
  public getLastMatches(page: number = 1, size: number = 10, includeSmurfs?: boolean, signal?: AbortSignal) {
    const params = new URLSearchParams({ page: String(page), size: String(size), includeOutOfCrew: 'false' })
    if (includeSmurfs === false) params.set('includeSmurfs', 'false')
    return this.get<PaginatedMatchResponse>(`/lol/match/last?${params.toString()}`, GameOnClient.opts(signal))
  }

  public getQueuesForPlayer(playerId: string | number, signal?: AbortSignal) {
    return this.get<LoLQueue[]>(`/lol/queue/player/${segment(playerId)}`, GameOnClient.opts(signal))
  }

  public getGameTimeline(matchId: string, signal?: AbortSignal) {
    return this.get<LoLGameTimelineFrame[]>(`/lol/match/${segment(matchId)}/timeline`, GameOnClient.opts(signal))
  }

  /**
   * Re-reads a stored match and its timeline from Riot. Answers `204` with no body. The API throws
   * (a `500`) when the match is not in its database, or when Riot does not serve it — which is the
   * case of every custom game: those come in through `importCustomGame` instead.
   */
  public async refreshGame(matchId: string, signal?: AbortSignal): Promise<void> {
    await this.post<unknown>(`/lol/match/${segment(matchId)}/update`, null, GameOnClient.opts(signal))
  }

  /**
   * Crew records. Every filter is written to the query string only when it departs from the API's
   * own default, so the URL stays minimal and two equivalent calls hit the same SWR cache entry.
   * `includeSmurfs` defaults to `true` upstream: at `false` the secondary accounts leave the records
   * entirely — no participations, no rank snapshots — and `totalGamesAnalyzed`, `totalPlayersTracked`
   * and `topChampions` move with them.
   */
  public getGlobalStats(queue?: string, period?: string, rankedOnly?: boolean, includeSmurfs?: boolean, signal?: AbortSignal) {
    const params = new URLSearchParams()
    if (queue && queue !== 'All') params.set('queue', queue)
    if (period && period !== 'AllTime') params.set('period', period)
    if (rankedOnly) params.set('rankedOnly', 'true')
    // Mirror of `rankedOnly`: written only when it differs from the upstream default, which is `true`
    // here. `=== false` rather than `!includeSmurfs`, so an omitted argument stays out of the query.
    if (includeSmurfs === false) params.set('includeSmurfs', 'false')
    const query = params.toString()
    return this.get<LoLGlobalStatsDto>(`/lol/Stats/global${query ? `?${query}` : ''}`, GameOnClient.opts(signal))
  }

  /**
   * Reads the coach's answer for a match, and never triggers anything. Three outcomes, two of which
   * are nominal: the report (`200`), a queue slot (`202`), or a `404` meaning nobody has asked yet.
   * Callers map that `404` onto `null` rather than an error, and poll this route while queued.
   */
  public getCoachReport(matchId: string, playerId: string | number, signal?: AbortSignal) {
    return this.get<LoLCoachResponse>(`/lol/coach/${segment(matchId)}/player/${segment(playerId)}`, GameOnClient.opts(signal))
  }

  /**
   * Asks for the analysis to be written. Authenticated, and immediate: it either hands back the
   * report already in cache or enqueues the work and returns the slot. The API deduplicates on
   * `(matchId, playerId)`, so a second click returns the existing position instead of a new one.
   */
  public generateCoachReport(matchId: string, playerId: string | number, signal?: AbortSignal) {
    return this.post<LoLCoachResponse>(
      `/lol/coach/${segment(matchId)}/player/${segment(playerId)}`,
      null,
      GameOnClient.opts(signal)
    )
  }

  /**
   * Regenerates a report that already exists: the stored one is thrown away and the model is paid
   * again. The API honours `force` for `gameon_admin` only and ignores it for anyone else.
   *
   * The queued slot is only visible in this answer. While it waits, `GET` keeps serving the *old*
   * report with a `200` — it reads the store before the queue — so a caller tracking the regeneration
   * compares `generatedOn` instead of waiting for a `202` that never comes. Never poll this route: once
   * the slot is done, a second `force` call buys a second generation.
   */
  public regenerateCoachReport(matchId: string, playerId: string | number, signal?: AbortSignal) {
    return this.post<LoLCoachResponse>(
      `/lol/coach/${segment(matchId)}/player/${segment(playerId)}?force=true`,
      null,
      GameOnClient.opts(signal)
    )
  }

  // --- Admin space -------------------------------------------------------------------------------
  // Routes marked `gameon_admin` are refused upstream to anyone else. The rest are anonymous on the
  // API and merely called from the admin UI.

  /**
   * Every account of one `archived` value, crew or not, smurfs included. The API filters on
   * `archived ==`, with no "both", so the admin space asks for each value in turn. Accounts without
   * a Riot PUUID are left out upstream.
   */
  public getAdminAccounts(archived: boolean, signal?: AbortSignal) {
    const params = new URLSearchParams({ archived: String(archived), includeOutOfCrew: 'true', includeSmurfs: 'true' })
    return this.get<LoLAdminAccountDto[]>(`/lol/summoner?${params.toString()}`, GameOnClient.opts(signal))
  }

  /** Re-reads every crew rank from Riot, as the API's own job does every 20 min. Answers `204`. */
  public async refreshAllRanks(signal?: AbortSignal): Promise<void> {
    await this.patch<unknown>('/lol/summoner/ranks', null, GameOnClient.opts(signal))
  }

  /** Reloads the queue referential (game mode names) from Riot. `gameon_admin`. Answers `204`. */
  public async syncQueues(signal?: AbortSignal): Promise<void> {
    await this.post<unknown>('/lol/queue/sync', null, GameOnClient.opts(signal))
  }

  /** `gameon_admin`. Overwrites the four fields it reads: always send the whole account. */
  public updatePlayer(player: UpdatePlayerDto, signal?: AbortSignal) {
    return this.patch<GameOnPlayerDto>('/player', player, GameOnClient.opts(signal))
  }

  /**
   * Points an account at another Riot ID. `gameon_admin`. The API answers `200` with the account
   * unchanged when Riot does not know that ID or when another account already uses it, so callers
   * compare the Riot ID they get back with the one they sent.
   *
   * Only safe on an account linked to a Keycloak user: the API looks the account up again by
   * `keycloakId`, and for an account without one (every smurf) that lookup matches the first
   * Keycloak-less account in the database rather than the one asked for.
   */
  public updateRiotId(playerId: number, gameName: string, tagLine: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ riotGamesNickname: gameName, riotGamesTagLine: tagLine })
    return this.patch<GameOnPlayerDto>(`/lol/summoner/${segment(playerId)}/admin?${params.toString()}`, null, GameOnClient.opts(signal))
  }

  /** `gameon_admin`. Taking a main out of the crew takes its smurfs out too; the reverse does not. */
  public setCrewMembership(playerId: number, inCrew: boolean, signal?: AbortSignal) {
    return this.patch<LoLSetCrewMembershipResultDto>(`/lol/summoner/${segment(playerId)}/crew?inCrew=${inCrew}`, null, GameOnClient.opts(signal))
  }

  /**
   * Attaches a Riot account to a main as its smurf, creating it when unknown and importing its rank
   * and recent games. `gameon_admin`. `404`: main or Riot account not found. `409`: the Riot account
   * already belongs to another player, or the target is itself a smurf.
   */
  public linkSmurf(mainPlayerId: number, gameName: string, tagLine: string, signal?: AbortSignal) {
    const params = new URLSearchParams({ riotGamesNickname: gameName, riotGamesTagLine: tagLine })
    return this.post<LoLLinkSmurfAccountResultDto>(`/lol/summoner/${segment(mainPlayerId)}/smurfs?${params.toString()}`, null, GameOnClient.opts(signal))
  }

  /** Detaches a smurf from its main; the account and its history stay. `gameon_admin`. */
  public unlinkSmurf(smurfId: number, signal?: AbortSignal) {
    return this.delete<GameOnPlayerDto>(`/lol/summoner/smurfs/${segment(smurfId)}`, GameOnClient.opts(signal))
  }

  /** Re-attributes the LP of every ranked game from the rank snapshots. `gameon_admin`, no Riot call. */
  public recomputeRankChanges(playerId: number | null, signal?: AbortSignal) {
    const query = playerId != null ? `?playerId=${segment(playerId)}` : ''
    return this.post<LoLRecomputeRankChangesResultDto>(`/lol/match/rank-changes/recompute${query}`, null, GameOnClient.opts(signal))
  }

  /** Imports a custom game dumped from the League client. `gameon_admin`; `400` on a bad payload. */
  public importCustomGame(payload: LoLCustomGameImportPayload, signal?: AbortSignal) {
    return this.post<LoLImportCustomGameResultDto>('/lol/match/custom/import', payload, GameOnClient.opts(signal))
  }

  public getCurrentPlayer(signal?: AbortSignal) {
    return this.get<LeaguePlayer>('/player/me', GameOnClient.opts(signal))
  }

  public updateCurrentPlayer(data: { FullName: string; Nickname: string; RiotGamesNickname?: string; RiotGamesTagLine?: string }, signal?: AbortSignal) {
    return this.patch<LeaguePlayer>('/player/me', data, GameOnClient.opts(signal))
  }

  /**
    * The API's response body is not used: the new picture is picked up by re-reading the profile,
    * whose `profilePictureUrl` is what the UI renders.
    */
  public async uploadProfilePicture(file: File, signal?: AbortSignal): Promise<void> {
    const formData = new FormData()
    formData.append('profilePicture', file)
    await this.post<unknown>('/player/pp', formData, GameOnClient.opts(signal))
  }
}

