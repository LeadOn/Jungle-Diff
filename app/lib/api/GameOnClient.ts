import { BaseApiService } from './BaseApiService'
import type { LoLQueue, Summoner, Match, LoLHomeStatsDto, LeaguePlayer, PaginatedMatchResponse, LeagueOfLegendsRank, LoLRankHistoryGranularity, LoLStatsPeriod } from '../types'

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
    return this.get<Match>(`/lol/match/${matchId}`, { signal })
  }

  public getLeaguePlayers(archived: boolean = false, signal?: AbortSignal) {
    return this.get<LeaguePlayer[]>(`/lol/summoner?archived=${archived}`, { signal })
  }

  public getPlayerById(id: string | number, period?: LoLStatsPeriod, signal?: AbortSignal) {
    const url = period ? `/lol/summoner/${id}?period=${period}` : `/lol/summoner/${id}`
    return this.get<LeaguePlayer>(url, { signal })
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

  public refreshGame(matchId: string, signal?: AbortSignal) {
    return this.post(`/lol/match/${matchId}/update`, null, { signal })
  }
}
