import { BaseApiService, encodePathSegment as segment } from './BaseApiService'
import type { RequestOptions } from './BaseApiService'
import type { LoLQueue, LoLHomeStatsDto, LeaguePlayer, PaginatedMatchResponse, LeagueOfLegendsRank, LoLRankHistoryGranularity, LoLStatsPeriod, LoLGameTimelineFrame, LoLGameDto, LoLGlobalStatsDto, LoLCoachReportDto } from '../types'

/**
 * Generating a coach report blocks while the model writes — around 15 s, well past the 8 s default.
 * The Nitro proxy grants the same endpoint a matching window, otherwise it would cut the call short
 * before this one ever expires.
 */
const COACH_GENERATION_TIMEOUT_MS = 60_000

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

  public getHomeStats(signal?: AbortSignal) {
    return this.get<LoLHomeStatsDto>('/lol/Home', GameOnClient.opts(signal))
  }

  public getQueues(signal?: AbortSignal) {
    return this.get<LoLQueue[]>('/lol/queue', GameOnClient.opts(signal))
  }

  public getMatch(matchId: string, signal?: AbortSignal) {
    return this.get<LoLGameDto>(`/lol/match/${segment(matchId)}`, GameOnClient.opts(signal))
  }

  public getLeaguePlayers(archived: boolean = false, signal?: AbortSignal) {
    return this.get<LeaguePlayer[]>(`/lol/summoner?archived=${archived}`, GameOnClient.opts(signal))
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

  public getLastMatches(page: number = 1, size: number = 10, signal?: AbortSignal) {
    return this.get<PaginatedMatchResponse>(`/lol/match/last?page=${page}&size=${size}`, GameOnClient.opts(signal))
  }

  public getQueuesForPlayer(playerId: string | number, signal?: AbortSignal) {
    return this.get<LoLQueue[]>(`/lol/queue/player/${segment(playerId)}`, GameOnClient.opts(signal))
  }

  public getGameTimeline(matchId: string, signal?: AbortSignal) {
    return this.get<LoLGameTimelineFrame[]>(`/lol/match/${segment(matchId)}/timeline`, GameOnClient.opts(signal))
  }

  public refreshGame(matchId: string, signal?: AbortSignal) {
    return this.post<LoLGameDto>(`/lol/match/${segment(matchId)}/update`, null, GameOnClient.opts(signal))
  }

  public getGlobalStats(queue?: string, period?: string, rankedOnly?: boolean, signal?: AbortSignal) {
    const params = new URLSearchParams()
    if (queue && queue !== 'All') params.set('queue', queue)
    if (period && period !== 'AllTime') params.set('period', period)
    if (rankedOnly) params.set('rankedOnly', 'true')
    const query = params.toString()
    return this.get<LoLGlobalStatsDto>(`/lol/Stats/global${query ? `?${query}` : ''}`, GameOnClient.opts(signal))
  }

  /**
   * Reads the stored coach report. A `404` here is nominal, not a failure: it means nobody has
   * asked for this analysis yet. Callers are expected to map it onto `null` rather than an error.
   */
  public getCoachReport(matchId: string, playerId: string | number, signal?: AbortSignal) {
    return this.get<LoLCoachReportDto>(`/lol/coach/${segment(matchId)}/player/${segment(playerId)}`, GameOnClient.opts(signal))
  }

  /**
   * Asks for the analysis to be written. Authenticated, slow, and idempotent in practice: once a
   * report exists the API returns it as-is instead of paying for a second generation.
   */
  public generateCoachReport(matchId: string, playerId: string | number, signal?: AbortSignal) {
    return this.post<LoLCoachReportDto>(
      `/lol/coach/${segment(matchId)}/player/${segment(playerId)}`,
      null,
      { ...GameOnClient.opts(signal), timeout: COACH_GENERATION_TIMEOUT_MS }
    )
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

