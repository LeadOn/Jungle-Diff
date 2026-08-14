export interface LoLGameTimelineFrame {
  id: number;
  matchId: string;
  timestamp: number;
  loLGameTimelineFrameParticipants: LoLGameTimelineFrameParticipant[];
  loLGameTimelineEvents: LoLGameTimelineEvent[];
}

export interface LoLGameTimelineFrameParticipant {
  id: number;
  lolGameTimelineFrameId: number;
  currentGold: number;
  goldPerSecond: number;
  jungleMinionsKilled: number;
  level: number;
  minionsKilled: number;
  participantId: number;
  timeEnemySpentControlled: number;
  totalGold: number;
  xp: number;
  participantPUUID: string;
  magicDamageDone: number;
  magicDamageDoneToChampions: number;
  magicDamageTaken: number;
  physicalDamageDone: number;
  physicalDamageDoneToChampions: number;
  physicalDamageTaken: number;
  totalDamageDone: number;
  totalDamageDoneToChampions: number;
  totalDamageTaken: number;
  trueDamageDone: number;
  trueDamageDoneToChampions: number;
  trueDamageTaken: number;
  positionX: number;
  positionY: number;
  abilityHaste: number;
  abilityPower: number;
  armor: number;
  armorPen: number;
  armorPenPercent: number;
  attackDamage: number;
  attackSpeed: number;
  bonusArmorPenPercent: number;
  bonusMagicPenPercent: number;
  ccReduction: number;
  cooldownReduction: number;
  health: number;
  healthMax: number;
  healthRegen: number;
  lifesteal: number;
  magicPen: number;
  magicPenPercent: number;
  magicResist: number;
  movementSpeed: number;
  omnivamp: number;
  physicalVamp: number;
  power: number;
  powerMax: number;
  powerRegen: number;
  spellVamp: number;
}

export interface LoLGameTimelineEvent {
  id: number;
  loLGameTimelineFrameId: number;
  matchId: string;
  timestamp: number;
  realTimestamp: number | null;
  eventType: string;

  // CHAMPION_KILL / CHAMPION_SPECIAL_KILL / BUILDING_KILL / TURRET_PLATE_DESTROYED / ELITE_MONSTER_KILL
  killerId: number | null;
  killerPUUID: string | null;
  positionX: number | null;
  positionY: number | null;

  // CHAMPION_KILL
  victimId: number | null;
  victimPUUID: string | null;
  bounty: number | null;
  shutdownBounty: number | null;
  killStreakLength: number | null;
  loLGameTimelineEventAssists: LoLGameTimelineEventAssist[];

  // CHAMPION_SPECIAL_KILL
  killType: string | null;
  multiKillLength: number | null;

  // WARD_PLACED / WARD_KILL
  creatorId: number | null;
  creatorPUUID: string | null;
  wardType: string | null;

  // ITEM_PURCHASED / ITEM_SOLD / ITEM_DESTROYED / ITEM_UNDO / SKILL_LEVEL_UP / LEVEL_UP
  participantId: number | null;
  participantPUUID: string | null;
  itemId: number | null;
  beforeId: number | null;
  afterId: number | null;
  goldGain: number | null;
  skillSlot: number | null;
  levelUpType: string | null;
  level: number | null;

  // BUILDING_KILL / TURRET_PLATE_DESTROYED
  teamId: number | null;
  buildingType: string | null;
  towerType: string | null;
  laneType: string | null;

  // ELITE_MONSTER_KILL
  killerTeamId: number | null;
  monsterType: string | null;
  monsterSubType: string | null;

  // CHAMPION_TRANSFORM
  transformType: string | null;

  // DRAGON_SOUL_GIVEN
  dragonSoulType: string | null;
}

export interface LoLGameTimelineEventAssist {
  id: number;
  participantId: number;
  participantPUUID: string;
}
