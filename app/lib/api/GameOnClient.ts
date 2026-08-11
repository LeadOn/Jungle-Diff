import { BaseApiService } from './BaseApiService'
import type { LoLQueue, Summoner, Match, LoLHomeStatsDto, LeaguePlayer } from '../types'

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
}
