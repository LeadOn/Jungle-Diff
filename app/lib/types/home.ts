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

export interface LoLFunStatDto {
  player: PlayerDto | null;
  value: number;
  detail: string | null;
  matchId: string | null;
  gameDate: string | null; // ISO 8601 UTC
}

export interface LoLGlobalStatsDto {
  totalGamesAnalyzed: number;
  totalPlayersTracked: number;
  pingMachine: LoLFunStatDto | null;
  biggestInter: LoLFunStatDto | null;
  highestBounty: LoLFunStatDto | null;
  shoppingAddict: LoLFunStatDto | null;
  oneTrickPony: LoLFunStatDto | null;
  crowdControlMaster: LoLFunStatDto | null;
  punchingBall: LoLFunStatDto | null;
  pacifist: LoLFunStatDto | null;
  squirrel: LoLFunStatDto | null;
  jungleThief: LoLFunStatDto | null;
  comebackKing: LoLFunStatDto | null;
  nightOwl: LoLFunStatDto | null;
  longestLossStreak: LoLFunStatDto | null;
  emotionalElevator: LoLFunStatDto | null;
  cursedPatch: LoLFunStatDto | null;
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
  crewRecords: LoLGlobalStatsDto;
}
