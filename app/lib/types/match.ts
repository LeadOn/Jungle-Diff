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
  leagueOfLegendsGameTeams: LoLGameTeamDto[];
  mvpParticipantId: number | null;
  aceParticipantId: number | null;
  frameInterval?: number;
  retrievedOn?: string;
}

export interface LoLGameParticipantDto {
  id?: number;
  playerId: number | null;
  player: {
    id: number;
    nickname: string;
  } | null;
  puuid?: string;
  championId: number;
  championName: string;
  riotIdGameName: string;
  riotIdTagLine: string;
  teamId: number;
  teamPosition: string;
  individualPosition?: string;
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
  allInPings?: number;
  assistMePings?: number;
  commandPings?: number;
  baronKills?: number;
  bountyLevel?: number;
  consumablesPurchased?: number;
  stats: LoLGameParticipantStats | null;
  challenges?: LoLGameParticipantChallenges | null;
}

export interface LoLGameParticipantStats {
  gameDurationSeconds: number;
  kda: number;
  killParticipationPercent: number;
  creepScore: number;
  csPerMinute: number;
  goldEarned: number;
  goldPerMinute: number;
  damageDealtToChampions: number;
  damagePerMinute: number;
  damageTaken: number;
  wardsPlaced: number;
  wardsKilled: number;
  computedOn?: string;
  rating: number;
  physicalDamageToChampions: number;
  magicDamageToChampions: number;
  trueDamageToChampions: number;
  timeCcOthersSeconds: number;
}

export interface LoLGameParticipantChallenges {
  loLGameParticipantId: number;
  oneTwoAssistStreakCount: number;
  baronBuffGoldAdvantageOverThreshold: number;
  controlWardTimeCoverageInRiverOrEnemyHalf: number;
  earliestBaron: number;
  earliestDragonTakedown: number;
  earliestElderDragon: number;
  earlyLaningPhaseGoldExpAdvantage: number;
  fasterSupportQuestCompletion: number;
  fastestLegendary: number;
  hadAfkTeammate: number;
  highestChampionDamage: number;
  highestCrowdControlScore: number;
  highestWardKills: number;
  junglerKillsEarlyJungle: number;
  killsOnLanersEarlyJungleAsJungler: number;
  laningPhaseGoldExpAdvantage: number;
  legendaryCount: number;
  maxCsAdvantageOnLaneOpponent: number;
  maxLevelLeadLaneOpponent: number;
  mostWardsDestroyedOneSweeper: number;
  mythicItemUsed: number;
  playedChampSelectPosition: number;
  soloTurretsLategame: number;
  takedownsFirst25Minutes: number;
  teleportTakedowns: number;
  thirdInhibitorDestroyedTime: number;
  threeWardsOneSweeperCount: number;
  visionScoreAdvantageLaneOpponent: number;
  infernalScalePickup: number;
  fistBumpParticipation: number;
  voidMonsterKill: number;
  abilityUses: number;
  acesBefore15Minutes: number;
  alliedJungleMonsterKills: number;
  baronTakedowns: number;
  blastConeOppositeOpponentCount: number;
  bountyGold: number;
  buffsStolen: number;
  completeSupportQuestInTime: number;
  controlWardsPlaced: number;
  damagePerMinute: number;
  damageTakenOnTeamPercentage: number;
  dancedWithRiftHerald: number;
  deathsByEnemyChamps: number;
  dodgeSkillShotsSmallWindow: number;
  doubleAces: number;
  dragonTakedowns: number;
  effectiveHealAndShielding: number;
  elderDragonKillsWithOpposingSoul: number;
  elderDragonMultikills: number;
  enemyChampionImmobilizations: number;
  enemyJungleMonsterKills: number;
  epicMonsterKillsNearEnemyJungler: number;
  epicMonsterKillsWithin30SecondsOfSpawn: number;
  epicMonsterSteals: number;
  epicMonsterStolenWithoutSmite: number;
  flawlessAces: number;
  fullTeamTakedown: number;
  gameLength: number;
  goldPerMinute: number;
  hadOpenNexus: number;
  immobilizeAndKillWithAlly: number;
  jungleCsBefore10Minutes: number;
  junglerTakedownsNearDamagedEpicMonster: number;
  kda: number;
  killAfterHiddenWithAlly: number;
  killParticipation: number;
  killsNearEnemyTurret: number;
  killsOnOtherLanesEarlyJungleAsLaner: number;
  killsUnderOwnTurret: number;
  killsWithHelpFromEpicMonster: number;
  knockEnemyIntoTeamAndKill: number;
  kTurretsDestroyedBeforePlatesFall: number;
  landSkillShotsEarlyGame: number;
  laneMinionsFirst10Minutes: number;
  lostAnInhibitor: number;
  maxKillDeficit: number;
  mejaisFullStackInTime: number;
  moreEnemyJungleThanOpponent: number;
  multiKillOneSpell: number;
  multikills: number;
  multikillsAfterAggressiveFlash: number;
  multiTurretRiftHeraldCount: number;
  outerTurretExecutesBefore10Minutes: number;
  outnumberedKills: number;
  outnumberedNexusKill: number;
  perfectDragonSoulsTaken: number;
  perfectGame: number;
  pickKillWithAlly: number;
  poroExplosions: number;
  quickCleanse: number;
  quickFirstTurret: number;
  riftHeraldTakedowns: number;
  saveAllyFromDeath: number;
  scuttleCrabKills: number;
  skillshotsDodged: number;
  skillshotsHit: number;
  snowballsHit: number;
  soloBaronKills: number;
  soloKills: number;
  stealthWardsPlaced: number;
  survivedSingleDigitHpCount: number;
  survivedThreeImmobilizesInFight: number;
  takedownOnFirstTurret: number;
  takedowns: number;
  takedownsAfterGainingLevelAdvantage: number;
  takedownsBeforeJungleMinionSpawn: number;
  takedownsInEnemyFountain: number;
  teamBaronKills: number;
  teamDamagePercentage: number;
  teamElderDragonKills: number;
  teamRiftHeraldKills: number;
  tookLargeDamageSurvived: number;
  turretPlatesTaken: number;
  turretsTakenWithRiftHerald: number;
  turretTakedowns: number;
  twentyMinionsIn3SecondsCount: number;
  unseenRecalls: number;
  visionScorePerMinute: number;
  wardsGuarded: number;
  wardTakedowns: number;
  wardTakedownsBefore20M: number;
}

export interface LoLGameTeamDto {
  teamId: number;
  win: boolean;
  championKills: number;
  towerKills: number;
  inhibitorKills: number;
  dragonKills: number;
  riftHeraldKills: number;
  baronKills: number;
  hordeKills: number;
  firstBlood: boolean;
  firstTower: boolean;
  firstInhibitor: boolean;
  firstDragon: boolean;
  firstBaron: boolean;
  firstRiftHerald: boolean;
  firstHorde: boolean;
}

export interface PaginatedMatchResponse {
  page: number;
  resultsPerPage: number;
  total: number;
  results: LoLGameDto[];
}

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
