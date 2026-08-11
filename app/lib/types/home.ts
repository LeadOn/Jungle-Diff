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
}
