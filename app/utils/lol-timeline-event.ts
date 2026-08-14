import type { LoLGameParticipantDto, LoLGameTeamDto } from '~/lib/types/match';
import type { LoLGameTimelineEvent, LoLGameTimelineFrame } from '~/lib/types/timeline';

export type KillFeedCategory = 'kills' | 'objectives' | 'wards' | 'other';

export interface TimelineEventEntry {
  event: LoLGameTimelineEvent;
  category: KillFeedCategory;
  /** Emoji glyph — only set for kill-related entries (no real single-sprite asset exists for these). */
  icon?: string;
  /** Real game sprite — set for every objective/structure/ward entry. */
  iconUrl?: string;
  label: string;
  killer?: LoLGameParticipantDto;
  victim?: LoLGameParticipantDto;
  assists: LoLGameParticipantDto[];
  teamId?: number | null;
}

const MINIMAP_ICONS = 'https://raw.communitydragon.org/latest/game/assets/ux/minimap/icons';

export const TOWER_ICON_URL = `${MINIMAP_ICONS}/tower.png`;
export const INHIBITOR_ICON_URL = `${MINIMAP_ICONS}/inhibitor.png`;
export const NEXUS_ICON_URL = `${MINIMAP_ICONS}/nexus.png`;
export const DRAGON_ICON_URL = `${MINIMAP_ICONS}/dragon.png`;
export const HERALD_ICON_URL = `${MINIMAP_ICONS}/riftherald.png`;
export const GRUB_ICON_URL = `${MINIMAP_ICONS}/grub.png`;
export const BARON_ICON_URL = `${MINIMAP_ICONS}/baron.png`;
export const ATAKHAN_ICON_URL = `${MINIMAP_ICONS}/atakhan_v.png`;
export const TURRET_PLATE_ICON_URL = `${MINIMAP_ICONS}/turret_1plate.png`;
export const WARD_ICON_URL = `${MINIMAP_ICONS}/minimap_ward_green_full.png`;
export const CONTROL_WARD_ICON_URL = `${MINIMAP_ICONS}/minimap_ward_pink_friendly.png`;

const DRAGON_SUBTYPE_ICON_FILES: Record<string, string> = {
  AIR_DRAGON: 'dragon_cloud.png',
  FIRE_DRAGON: 'dragon_infernal.png',
  EARTH_DRAGON: 'dragon_mountain.png',
  WATER_DRAGON: 'dragon_ocean.png',
  CHEMTECH_DRAGON: 'dragon_chemtech.png',
  HEXTECH_DRAGON: 'dragon_hextech.png',
  ELDER_DRAGON: 'dragon_elder.png',
};

const SOUL_TYPE_TO_SUBTYPE: Record<string, string> = {
  Cloud: 'AIR_DRAGON',
  Infernal: 'FIRE_DRAGON',
  Mountain: 'EARTH_DRAGON',
  Ocean: 'WATER_DRAGON',
  Chemtech: 'CHEMTECH_DRAGON',
  Hextech: 'HEXTECH_DRAGON',
};

export function dragonIconUrl(monsterSubType?: string | null): string {
  const file = monsterSubType ? DRAGON_SUBTYPE_ICON_FILES[monsterSubType] : undefined;
  return `${MINIMAP_ICONS}/${file ?? 'dragon.png'}`;
}

export function dragonSoulIconUrl(dragonSoulType?: string | null): string {
  const subType = dragonSoulType ? SOUL_TYPE_TO_SUBTYPE[dragonSoulType] : undefined;
  return dragonIconUrl(subType);
}

const DRAGON_SUBTYPE_LABELS: Record<string, string> = {
  AIR_DRAGON: 'des Nuées',
  FIRE_DRAGON: 'Infernal',
  EARTH_DRAGON: 'Montagneux',
  WATER_DRAGON: 'Océanique',
  CHEMTECH_DRAGON: 'Chimtech',
  HEXTECH_DRAGON: 'Hextech',
  ELDER_DRAGON: 'Ancien',
};

const MONSTER_LABELS: Record<string, string> = {
  DRAGON: 'Dragon',
  RIFTHERALD: 'Héraut de la Faille',
  BARON_NASHOR: 'Baron Nashor',
  HORDE: 'Voracraves',
  ATAKHAN: 'Atakhan',
};

const TOWER_TYPE_LABELS: Record<string, string> = {
  OUTER_TURRET: 'extérieure',
  INNER_TURRET: 'intérieure',
  BASE_TURRET: 'de base',
  NEXUS_TURRET: 'du nexus',
};

const LANE_LABELS: Record<string, string> = {
  TOP_LANE: 'Top',
  MID_LANE: 'Mid',
  BOT_LANE: 'Bot',
};

const WARD_TYPE_LABELS: Record<string, string> = {
  CONTROL_WARD: 'balise de contrôle',
  YELLOW_TRINKET: 'balise',
  SIGHT_WARD: 'balise de vision',
  BLUE_TRINKET: 'balise bleue',
  TEEMO_MUSHROOM: 'champignon',
};

export function monsterIconUrl(event: LoLGameTimelineEvent): string {
  switch (event.monsterType) {
    case 'BARON_NASHOR':
      return BARON_ICON_URL;
    case 'RIFTHERALD':
      return HERALD_ICON_URL;
    case 'HORDE':
      return GRUB_ICON_URL;
    case 'ATAKHAN':
      return ATAKHAN_ICON_URL;
    default:
      return dragonIconUrl(event.monsterSubType);
  }
}

export function buildingIconUrl(event: LoLGameTimelineEvent): string {
  return event.buildingType === 'INHIBITOR_BUILDING'
    ? INHIBITOR_ICON_URL
    : TOWER_ICON_URL;
}

export function wardIconUrl(event: LoLGameTimelineEvent): string {
  return event.wardType === 'CONTROL_WARD' ? CONTROL_WARD_ICON_URL : WARD_ICON_URL;
}

export function monsterLabel(event: LoLGameTimelineEvent): string {
  const base = event.monsterType
    ? (MONSTER_LABELS[event.monsterType] ?? event.monsterType)
    : 'Monstre';

  if (event.monsterType === 'DRAGON' && event.monsterSubType) {
    const subtype = DRAGON_SUBTYPE_LABELS[event.monsterSubType];
    return subtype ? `Dragon ${subtype}` : base;
  }

  return base;
}

export function buildingLabel(event: LoLGameTimelineEvent): string {
  const lane = event.laneType ? (LANE_LABELS[event.laneType] ?? '') : '';

  if (event.buildingType === 'INHIBITOR_BUILDING') {
    return `Inhibiteur ${lane}`.trim();
  }

  const towerPos = event.towerType
    ? (TOWER_TYPE_LABELS[event.towerType] ?? '')
    : '';
  return `Tourelle ${lane} ${towerPos}`.replace(/\s+/g, ' ').trim();
}

export function wardTypeLabel(event: LoLGameTimelineEvent): string {
  if (!event.wardType) {
    return 'balise';
  }
  return WARD_TYPE_LABELS[event.wardType] ?? 'balise';
}

export function killTypeLabel(event: LoLGameTimelineEvent): string {
  switch (event.killType) {
    case 'KILL_FIRST_BLOOD':
      return 'Premier sang';
    case 'KILL_MULTI':
      return `${event.multiKillLength ?? 2}x kill`;
    case 'KILL_ACE':
      return 'Ace';
    default:
      return event.killType ?? 'Kill spécial';
  }
}

export function findByPuuid(
  players: LoLGameParticipantDto[],
  puuid?: string | null,
): LoLGameParticipantDto | undefined {
  if (!puuid) {
    return undefined;
  }
  return players.find((p) => p.puuid === puuid);
}

export function allTimelineEvents(
  timeline: LoLGameTimelineFrame[] | undefined,
): LoLGameTimelineEvent[] {
  if (!timeline) {
    return [];
  }

  return timeline
    .flatMap((frame) => frame.loLGameTimelineEvents ?? [])
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function describeEvent(
  event: LoLGameTimelineEvent,
  players: LoLGameParticipantDto[],
): TimelineEventEntry {
  const killer = findByPuuid(
    players,
    event.killerId ? event.killerPUUID : null,
  );

  switch (event.eventType) {
    case 'CHAMPION_KILL': {
      const victim = findByPuuid(players, event.victimPUUID);
      const assists = (event.loLGameTimelineEventAssists ?? [])
        .map((a) => findByPuuid(players, a.participantPUUID))
        .filter((p): p is LoLGameParticipantDto => p != null);
      return {
        event,
        category: 'kills',
        icon: '⚔️',
        label: 'a éliminé',
        killer,
        victim,
        assists,
        teamId: killer?.teamId,
      };
    }
    case 'CHAMPION_SPECIAL_KILL': {
      return {
        event,
        category: 'kills',
        icon: event.killType === 'KILL_FIRST_BLOOD' ? '🩸' : '💥',
        label: killTypeLabel(event),
        killer,
        assists: [],
        teamId: killer?.teamId,
      };
    }
    case 'ELITE_MONSTER_KILL': {
      const monsterKiller = findByPuuid(players, event.killerPUUID);
      const assists = (event.loLGameTimelineEventAssists ?? [])
        .map((a) => findByPuuid(players, a.participantPUUID))
        .filter((p): p is LoLGameParticipantDto => p != null);
      return {
        event,
        category: 'objectives',
        iconUrl: monsterIconUrl(event),
        label: `a pris ${monsterLabel(event)}`,
        killer: monsterKiller,
        assists,
        teamId: event.killerTeamId ?? monsterKiller?.teamId,
      };
    }
    case 'BUILDING_KILL': {
      const buildingKiller = findByPuuid(players, event.killerPUUID);
      const assists = (event.loLGameTimelineEventAssists ?? [])
        .map((a) => findByPuuid(players, a.participantPUUID))
        .filter((p): p is LoLGameParticipantDto => p != null);
      return {
        event,
        category: 'objectives',
        iconUrl: buildingIconUrl(event),
        label: `a détruit : ${buildingLabel(event)}`,
        killer: buildingKiller,
        assists,
        teamId: event.teamId,
      };
    }
    case 'TURRET_PLATE_DESTROYED': {
      const plateKiller = findByPuuid(players, event.killerPUUID);
      const lane = event.laneType ? (LANE_LABELS[event.laneType] ?? '') : '';
      return {
        event,
        category: 'objectives',
        iconUrl: TURRET_PLATE_ICON_URL,
        label: `a fait tomber une plaque ${lane}`.trim(),
        killer: plateKiller,
        assists: [],
        teamId: event.teamId,
      };
    }
    case 'DRAGON_SOUL_GIVEN': {
      return {
        event,
        category: 'objectives',
        iconUrl: dragonSoulIconUrl(event.dragonSoulType),
        label: `Âme de dragon obtenue${event.dragonSoulType ? ` (${DRAGON_SUBTYPE_LABELS[event.dragonSoulType] ?? event.dragonSoulType})` : ''}`,
        assists: [],
        teamId: event.teamId,
      };
    }
    case 'WARD_PLACED': {
      const creator = findByPuuid(players, event.creatorPUUID);
      return {
        event,
        category: 'wards',
        iconUrl: wardIconUrl(event),
        label: `a posé une ${wardTypeLabel(event)}`,
        killer: creator,
        assists: [],
        teamId: creator?.teamId,
      };
    }
    case 'WARD_KILL': {
      const wardKiller = findByPuuid(players, event.killerPUUID);
      return {
        event,
        category: 'wards',
        iconUrl: wardIconUrl(event),
        label: `a détruit une ${wardTypeLabel(event)}`,
        killer: wardKiller,
        assists: [],
        teamId: wardKiller?.teamId,
      };
    }
    default: {
      return {
        event,
        category: 'other',
        icon: '•',
        label: event.eventType,
        assists: [],
      };
    }
  }
}

export function maxBountyOnHead(
  timeline: LoLGameTimelineFrame[] | undefined,
  puuid?: string,
): number {
  if (!puuid) {
    return 0;
  }

  return allTimelineEvents(timeline)
    .filter(
      (event) =>
        event.eventType === 'CHAMPION_KILL' && event.victimPUUID === puuid,
    )
    .reduce((max, event) => Math.max(max, event.bounty ?? 0), 0);
}

export interface TeamObjectives {
  kills: number;
  towers: number;
  inhibitors: number;
  dragons: number;
  heralds: number;
  grubs: number;
  barons: number;
  atakhans: number;
}

function monsterKillTeamId(
  event: LoLGameTimelineEvent,
  players: LoLGameParticipantDto[],
): number | undefined {
  if (event.killerTeamId === 100 || event.killerTeamId === 200) {
    return event.killerTeamId;
  }

  return findByPuuid(players, event.killerPUUID)?.teamId;
}

export function teamObjectives(
  timeline: LoLGameTimelineFrame[] | undefined,
  players: LoLGameParticipantDto[],
  teamId: number,
): TeamObjectives {
  const roster = players.filter((p) => p.teamId === teamId);
  const objectives: TeamObjectives = {
    kills: roster.reduce((sum, p) => sum + p.kills, 0),
    towers: 0,
    inhibitors: 0,
    dragons: 0,
    heralds: 0,
    grubs: 0,
    barons: 0,
    atakhans: 0,
  };

  for (const event of allTimelineEvents(timeline)) {
    if (event.eventType === 'BUILDING_KILL') {
      if (event.teamId == null || event.teamId === teamId) {
        continue;
      }

      if (event.buildingType === 'INHIBITOR_BUILDING') {
        objectives.inhibitors++;
      } else {
        objectives.towers++;
      }

      continue;
    }

    if (
      event.eventType !== 'ELITE_MONSTER_KILL' ||
      monsterKillTeamId(event, players) !== teamId
    ) {
      continue;
    }

    switch (event.monsterType) {
      case 'DRAGON':
        objectives.dragons++;
        break;
      case 'RIFTHERALD':
        objectives.heralds++;
        break;
      case 'HORDE':
        objectives.grubs++;
        break;
      case 'BARON_NASHOR':
        objectives.barons++;
        break;
      case 'ATAKHAN':
        objectives.atakhans++;
        break;
    }
  }

  if (objectives.barons === 0) {
    objectives.barons = roster.reduce((sum, p) => sum + (p.baronKills ?? 0), 0);
  }

  return objectives;
}

function atakhanKillsForTeam(
  timeline: LoLGameTimelineFrame[] | undefined,
  players: LoLGameParticipantDto[],
  teamId: number,
): number {
  let count = 0;

  for (const event of allTimelineEvents(timeline)) {
    if (
      event.eventType === 'ELITE_MONSTER_KILL' &&
      event.monsterType === 'ATAKHAN' &&
      monsterKillTeamId(event, players) === teamId
    ) {
      count++;
    }
  }

  return count;
}

export function teamObjectivesFor(
  teams: LoLGameTeamDto[],
  timeline: LoLGameTimelineFrame[] | undefined,
  players: LoLGameParticipantDto[],
  teamId: number,
): TeamObjectives {
  const apiTeam = (teams || []).find((t) => t.teamId === teamId);

  if (apiTeam == null) {
    return teamObjectives(timeline, players, teamId);
  }

  return {
    kills: apiTeam.championKills,
    towers: apiTeam.towerKills,
    inhibitors: apiTeam.inhibitorKills,
    dragons: apiTeam.dragonKills,
    heralds: apiTeam.riftHeraldKills,
    grubs: apiTeam.hordeKills,
    barons: apiTeam.baronKills,
    atakhans: atakhanKillsForTeam(timeline, players, teamId),
  };
}

export function teamAccentTextClass(teamId?: number | null): string {
  if (teamId === 100) return 'text-mpGreenInk';
  if (teamId === 200) return 'text-mpRedInk';
  return 'text-mpTextSecondary';
}
