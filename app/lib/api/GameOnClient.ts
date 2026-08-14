import { BaseApiService } from './BaseApiService'
import type { LoLQueue, Summoner, Match, LoLHomeStatsDto, LeaguePlayer, PaginatedMatchResponse, LeagueOfLegendsRank, LoLRankHistoryGranularity, LoLStatsPeriod, LoLGameTimelineFrame, LoLGameDto, LoLGlobalStatsDto } from '../types'

export class GameOnClient extends BaseApiService {
  constructor(baseUrl: string) {
    super(baseUrl, true) // Requires auth
  }

  public getHomeStats(signal?: AbortSignal) {
    return this.get<LoLHomeStatsDto>('/lol/Home', { signal })
  }

  public getQueues(signal?: AbortSignal) {
    return this.get<LoLQueue[]>('/lol/queue', { signal })
  }

  public getSummonerByName(name: string, signal?: AbortSignal) {
    return this.get<Summoner>(`/lol/summoner/by-name/${encodeURIComponent(name)}`, { signal })
  }

  public getMatch(matchId: string, signal?: AbortSignal) {
    return this.get<LoLGameDto>(`/lol/match/${matchId}`, { signal })
  }

  public getLeaguePlayers(archived: boolean = false, signal?: AbortSignal) {
    return this.get<LeaguePlayer[]>(`/lol/summoner?archived=${archived}`, { signal })
  }

  public getPlayerById(id: string | number, period?: LoLStatsPeriod, queueIds?: number[] | null, signal?: AbortSignal) {
    const params = new URLSearchParams()
    if (period) params.set('period', period)
    if (queueIds && queueIds.length > 0) params.set('queues', queueIds.join(','))
    const query = params.toString()
    return this.get<LeaguePlayer>(`/lol/summoner/${id}${query ? `?${query}` : ''}`, { signal })
  }

  public getRankHistory(id: string | number, granularity: LoLRankHistoryGranularity, days?: number, signal?: AbortSignal) {
    let url = `/lol/summoner/${id}/rank?granularity=${granularity}`
    if (days != null) {
      url += `&days=${days}`
    }
    return this.get<LeagueOfLegendsRank[]>(url, { signal })
  }

  public refreshPlayer(id: string | number, signal?: AbortSignal) {
    return this.patch<LeaguePlayer>(`/lol/summoner/${id}`, null, { signal })
  }

  public getLastGamesPlayedByPlayer(
    playerId: string | number,
    page: number = 1,
    size: number = 10,
    rankedOnly: boolean = false,
    queueIds?: number[] | null,
    startDate?: string | null,
    endDate?: string | null,
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

    return this.get<PaginatedMatchResponse>(`/lol/match/player/${playerId}?${params.toString()}`, { signal })
  }

  public getLastMatches(page: number = 1, size: number = 10, signal?: AbortSignal) {
    return this.get<PaginatedMatchResponse>(`/lol/match/last?page=${page}&size=${size}`, { signal })
  }

  public getQueuesForPlayer(playerId: string | number, signal?: AbortSignal) {
    return this.get<LoLQueue[]>(`/lol/queue/player/${playerId}`, { signal })
  }

  public getGameTimeline(matchId: string, signal?: AbortSignal) {
    return this.get<LoLGameTimelineFrame[]>(`/lol/match/${matchId}/timeline`, { signal })
  }

  public refreshGame(matchId: string, signal?: AbortSignal) {
    return this.post(`/lol/match/${matchId}/update`, null, { signal })
  }

  public getGlobalStats(queue?: string, period?: string, rankedOnly?: boolean, signal?: AbortSignal) {
    const params = new URLSearchParams()
    if (queue && queue !== 'All') params.set('queue', queue)
    if (period && period !== 'AllTime') params.set('period', period)
    if (rankedOnly) params.set('rankedOnly', 'true')
    const query = params.toString()
    return this.get<LoLGlobalStatsDto>(`/lol/Stats/global${query ? `?${query}` : ''}`, { signal })
  }

  public getCurrentPlayer(signal?: AbortSignal) {
    return this.get<LeaguePlayer>('/player/me', { signal })
  }

  public updateCurrentPlayer(data: { FullName: string; Nickname: string; RiotGamesNickname?: string; RiotGamesTagLine?: string }, signal?: AbortSignal) {
    return this.patch<LeaguePlayer>('/player/me', data, { signal })
  }

  public uploadProfilePicture(file: File, signal?: AbortSignal) {
    const formData = new FormData()
    formData.append('profilePicture', file)
    return this.post<any>('/player/pp', formData, { signal })
  }
}
