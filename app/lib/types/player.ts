import type { LoLChampionStatDto, PlayerDto } from './home'
import type { LoLGameParticipantRankChange } from './match'

export interface LeagueOfLegendsRank {
  id: number;
  playerId: number;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
  createdOn: string;
}

export interface LeaguePlayer {
  id: number;
  nickname: string;
  profilePictureUrl: string | null;
  riotGamesNickname: string | null;
  riotGamesTagLine: string | null;
  lolIconId: number | null;
  lolSummonerLevel?: number | null;
  fullName?: string | null;
  archived?: boolean;
  primaryPlayerId?: number | null;
  lolRefreshedOn: string | null;
  leagueOfLegendsSoloRank: LeagueOfLegendsRank | null;
  leagueOfLegendsFlexRank: LeagueOfLegendsRank | null;
  recentFormSolo: boolean[];
  recentFormFlex: boolean[];
  lpChange7DaysSolo: number | null;
  lpChange7DaysFlex: number | null;
  performanceStats: LoLSummonerPerformanceStats | null;
}

export type LoLRankHistoryGranularity = 'Day' | 'Week' | 'Month';

export type LoLRankChangeQueue = 'All' | 'Solo' | 'Flex';

/**
 * One ranked game of `GET /lol/summoner/{id}/rank/changes`, which lists them oldest first. The game
 * was played even when `rankChange` is `null` — only its LP are unknown — so it keeps its slot.
 */
export interface LoLRankChangeEntryDto {
  matchId: string;
  queueId: number; // 420 Solo/Duo, 440 Flex
  gameStart: string; // ISO 8601 UTC
  win: boolean;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  rankChange: LoLGameParticipantRankChange | null;
}

export type LoLStatsPeriod = 'AllTime' | 'Week' | 'Month' | 'ThreeMonths' | 'SixMonths';

export interface LoLRoleStatDto {
  teamPosition: string;
  gamesPlayed: number;
  wins: number;
  playRate: number;
  winRate: number;
}

export interface LoLDuoStatDto {
  player: PlayerDto;
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

export interface LoLSummonerPerformanceStats {
  championStats: LoLChampionStatDto[];
  roleStats: LoLRoleStatDto[];
  duoStats: LoLDuoStatDto[];
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRatePercent: number;
  totalPlaytimeSeconds: number;
  averageGameDurationSeconds: number;
  averageKda: number;
  averageCsPerMinute: number;
  averageDamagePerMinute: number;
  averageVisionScore: number;
}
