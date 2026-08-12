export interface Match {
  metadata: {
    dataVersion: string
    matchId: string
    participants: string[]
  }
  info: {
    gameCreation: number
    gameDuration: number
    gameEndTimestamp: number
    gameId: number
    gameMode: string
    gameName: string
    gameStartTimestamp: number
    gameType: string
    gameVersion: string
    mapId: number
    participants: Participant[]
    platformId: string
    queueId: number
    teams: Team[]
    tournamentCode: string
  }
}

export interface Participant {
  puuid: string
  summonerName: string
  championId: number
  championName: string
  teamId: number
  win: boolean
  kills: number
  deaths: number
  assists: number
  totalDamageDealtToChampions: number
  goldEarned: number
  item0: number
  item1: number
  item2: number
  item3: number
  item4: number
  item5: number
  item6: number
  role: string
  lane: string
}

export interface Team {
  teamId: number
  win: boolean
}

export interface PaginatedMatchResponse {
  page: number;
  resultsPerPage: number;
  total: number;
  results: LoLGameDto[];
}

export interface LoLGameDto {
  gameId: number;
  matchId: string;
  endOfGameResult: string | null;
  gameVersion: string;
  gameStart: string; // ISO 8601 UTC
  gameEnd: string; // ISO 8601 UTC
  winningTeamId: number | null;
  isRemake: boolean;
  queueId: number | null;
  queue: null; // Always null according to spec
  leagueOfLegendsGameParticipants: LoLGameParticipantDto[];
  loLGameTimelineFrames: null;
  leagueOfLegendsGameTeams: null;
  mvpParticipantId: number | null;
  aceParticipantId: number | null;
}

export interface LoLGameParticipantDto {
  playerId: number | null;
  player: null; // Always null according to spec
  championId: number;
  championName: string;
  riotIdGameName: string;
  riotIdTagLine: string;
  teamId: number;
  teamPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  champLevel: number;
  visionScore: number;
  stats: {
    kda: number;
    killParticipationPercent: number;
    csPerMinute: number;
    goldPerMinute: number;
    damagePerMinute: number;
    rating: number;
  } | null;
}
