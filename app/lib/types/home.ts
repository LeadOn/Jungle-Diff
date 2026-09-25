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
  primaryPlayerId: number | null;
  /** Most played champion over the last rolling month. Only served by `GET /lol/summoner`. */
  mainChampionName?: string | null;
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

export interface LoLChampionStatDto {
  championName: string;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  kda: number;
}

/** The account that played a champion the most, within the same games as the entry holding it. */
export interface LoLChampionTopPlayerDto {
  /** Identity fields only: ranks, recent form and performance stats are left empty. */
  player: PlayerDto;
  gamesPlayed: number;
}

/**
 * A champion's numbers across the whole crew. A subclass on the API side rather than a nullable field
 * on `LoLChampionStatDto`, which also describes a single account's champions.
 */
export interface LoLCrewChampionStatDto extends LoLChampionStatDto {
  /** Never null when present; absent from API builds older than 2026-09. */
  topPlayer?: LoLChampionTopPlayerDto;
}

export interface LoLGlobalStatsDto {
  totalGamesAnalyzed: number;
  totalPlayersTracked: number;
  topChampions: LoLCrewChampionStatDto[];
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

/**
 * The window `GET /lol/Home` summarises. `CalendarWeek` (the API's default) runs from Monday 00:00 to
 * now, against the previous full week; `Last7Days` from six days ago 00:00 to now, against the seven
 * days before. Days are cut on Europe/Paris time.
 */
export type LoLHomeWindow = 'CalendarWeek' | 'Last7Days'

/** One day of the window: ranked games only, on the same rules as the weekly totals. */
export interface LoLDailyActivityDto {
  /** `yyyy-MM-dd`, Europe/Paris. A game belongs to the day it started on. */
  date: string;
  games: number;
  wins: number;
  losses: number;
  /** Rounded to a tenth, spread so that the days add up to the weekly total exactly. */
  playtimeMinutes: number;
  /**
   * Net LP of the whole crew that day. `null` when no account has a comparable pair of rank
   * snapshots that day — not the same as 0, which means gains and losses cancelled out.
   */
  netLpChange: number | null;
}

/** An account with at least one ranked game over the window. */
export interface LoLActivePlayerDto {
  /** Identity fields only: ranks, recent form and performance stats are left empty. */
  player: PlayerDto;
  games: number;
  wins: number;
}

/**
 * Ranked games only (Solo/Duo and Flex), over the window requested.
 *
 * The optional fields arrived with the `window` parameter (GameOn API, 2026-09): an older API build
 * omits them — and ignores `window`, answering for the calendar week. Front and API ship separately,
 * so the page must degrade on their absence rather than fail to render.
 */
export interface LoLWeeklyActivityDto {
  /** Start of the window, UTC, inclusive. */
  windowStart?: string;
  /** When the recap was computed, UTC. */
  windowEnd?: string;
  /** Start of the previous window, UTC: always seven full days, ending where this one starts. */
  previousWindowStart?: string;
  gamesThisWeek: number;
  gamesLastWeek: number;
  winsThisWeek: number;
  lossesThisWeek: number;
  winsLastWeek?: number;
  lossesLastWeek?: number;
  winRateThisWeek: number;
  totalPlaytimeMinutesThisWeek: number;
  averageGameDurationMinutesThisWeek: number;
  netLpChangeThisWeek: number;
  /** One entry per day of the window, oldest first, days without games included (at 0). */
  days?: LoLDailyActivityDto[];
  /** Sorted by games, most first. Their games add up to `gamesThisWeek`. */
  activePlayers?: LoLActivePlayerDto[];
}

/**
 * A crew member in a game right now, from Riot's spectator-v5 through a one-minute server cache. One
 * entry per account: crew members in the same game share `gameId`.
 */
export interface LoLLiveGameDto {
  /** Identity fields only. */
  player: PlayerDto;
  gameId: number;
  championId: number;
  /** Riot's internal name ("MonkeyKing"). `null` for a champion too recent for the API's referential. */
  championName: string | null;
  /** `null` for a custom game. */
  queueId: number | null;
  /** 100 blue, 200 red: two crew members on different sides are playing against each other. */
  teamId: number;
  /** UTC. `null` while the players are still on the loading screen. */
  gameStart: string | null;
  /** As Riot reported it at `retrievedOn`: add the time elapsed since for a live counter. */
  gameLengthSeconds: number;
  /** UTC. Usually under a minute old, older while Riot rate-limits the API. */
  retrievedOn: string;
}

export interface LoLHomeStatsDto {
  weeklyActivity: LoLWeeklyActivityDto;
  factOfTheWeek: LoLFactOfTheWeekDto | null;
  crewRecords: LoLGlobalStatsDto;
}
