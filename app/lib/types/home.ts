export interface PlayerDto {
  id: number;
  keycloakId: string | null;
  fullName: string | null;
  nickname: string;
  profilePictureUrl: string | null;
  riotGamesNickname: string | null;
  riotGamesTagLine: string | null;
  riotGamesPUUID: string | null;
  lolSummonerLevel: number | null;
  lolIconId: number | null;
  lolRefreshedOn: string | null; // ISO 8601 UTC
  createdOn: string;             // ISO 8601 UTC
  archived: boolean;
}

export interface LoLFactOfTheWeekDto {
  player: PlayerDto;
  lpChange: number;
  gamesThisWeek: number;
  winsThisWeek: number;
  winRateThisWeek: number;
  longestWinStreakThisWeek: number;
}

export interface LoLHomeStatsDto {
  weeklyActivity: {
    gamesThisWeek: number;
    gamesLastWeek: number;
    winsThisWeek: number;
    lossesThisWeek: number;
    winRateThisWeek: number;
    totalPlaytimeMinutesThisWeek: number;
    averageGameDurationMinutesThisWeek: number;
    netLpChangeThisWeek: number;
  };
  factOfTheWeek: LoLFactOfTheWeekDto | null;
}
