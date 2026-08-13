import type { LoLChampionStatDto, PlayerDto } from './home'

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
