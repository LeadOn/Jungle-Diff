import type { LoLGameDto, LoLGameParticipantDto } from '~/lib/types/match';
import type { LoLGameTimelineFrame, LoLGameTimelineFrameParticipant } from '~/lib/types/timeline';

export function kda(player: LoLGameParticipantDto): number {
  if (player.challenges != null) {
    return player.challenges.kda;
  }

  if (player.stats != null) {
    return player.stats.kda;
  }

  const denominator = player.deaths === 0 ? 1 : player.deaths;
  return (player.kills + player.assists) / denominator;
}

export function decimalLabel(value: number, fractionDigits = 1): string {
  return value.toFixed(fractionDigits).replace('.', ',');
}

export function kdaLabel(player: LoLGameParticipantDto): string {
  return decimalLabel(kda(player), 2);
}

export function kdaColorClass(value: number): string {
  if (value >= 3) return 'text-mpGreenInk';
  if (value >= 2) return 'text-mpYellowInk';
  return 'text-mpTextSecondary';
}

export function itemSlots(player: LoLGameParticipantDto): number[] {
  return [
    player.item0,
    player.item1,
    player.item2,
    player.item3,
    player.item4,
    player.item5,
    player.item6,
  ];
}

export function closestDdragonVersion(
  gameVersion: string,
  availableVersions: string[],
): string {
  const parts = gameVersion.split('.').map(Number);
  const gameMajor = parts[0] ?? NaN;
  const gameMinor = parts[1] ?? NaN;

  if (
    availableVersions.length === 0 ||
    Number.isNaN(gameMajor) ||
    Number.isNaN(gameMinor)
  ) {
    return gameVersion;
  }

  const gameScore = gameMajor * 100 + gameMinor;
  let closest = availableVersions[0];
  let closestDistance = Infinity;

  for (const version of availableVersions) {
    const parts2 = version.split('.').map(Number);
    const major = parts2[0] ?? NaN;
    const minor = parts2[1] ?? NaN;

    if (Number.isNaN(major) || Number.isNaN(minor)) {
      continue;
    }

    const distance = Math.abs(major * 100 + minor - gameScore);

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = version;

      if (distance === 0) {
        break;
      }
    }
  }

  return closest || gameVersion;
}

export function championIconUrl(
  championName: string | undefined,
  patch: string,
): string {
  if (championName == null || championName === '') {
    return 'assets/img/gameon-logo.webp';
  }

  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${championName}.png`;
}

export function itemIconUrl(itemId: number, patch: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${itemId}.png`;
}

export function latestFrame(
  timeline: LoLGameTimelineFrame[] | undefined,
): LoLGameTimelineFrame | undefined {
  if (timeline == null || timeline.length === 0) {
    return undefined;
  }

  return timeline.reduce((a, b) => (a.timestamp >= b.timestamp ? a : b));
}

export function frameStatsFor(
  frame: LoLGameTimelineFrame | undefined,
  puuid?: string,
): LoLGameTimelineFrameParticipant | undefined {
  return frame?.loLGameTimelineFrameParticipants.find(
    (p) => p.participantPUUID === puuid,
  );
}

export function latestStatsFor(
  timeline: LoLGameTimelineFrame[] | undefined,
  puuid?: string,
): LoLGameTimelineFrameParticipant | undefined {
  return frameStatsFor(latestFrame(timeline), puuid);
}

export function csFor(
  timeline: LoLGameTimelineFrame[] | undefined,
  puuid?: string,
): number {
  const stats = latestStatsFor(timeline, puuid);
  if (stats == null) {
    return 0;
  }

  return stats.minionsKilled + stats.jungleMinionsKilled;
}

export function csPerMinute(cs: number, durationSeconds: number): number {
  if (durationSeconds <= 0) {
    return 0;
  }

  return cs / (durationSeconds / 60);
}

export function teamKillCount(team: LoLGameParticipantDto[]): number {
  return team.reduce((sum, p) => sum + p.kills, 0);
}

export function killParticipation(
  player: LoLGameParticipantDto,
  team: LoLGameParticipantDto[],
): number {
  const total = teamKillCount(team);
  if (total === 0) {
    return 0;
  }

  return Math.round(((player.kills + player.assists) / total) * 100);
}

export function creepScoreFor(
  player: LoLGameParticipantDto,
  timeline: LoLGameTimelineFrame[] | undefined,
): number {
  return player.stats?.creepScore ?? csFor(timeline, player.puuid);
}

export function goldEarnedFor(
  player: LoLGameParticipantDto,
  timeline: LoLGameTimelineFrame[] | undefined,
): number {
  return (
    player.stats?.goldEarned ??
    latestStatsFor(timeline, player.puuid)?.totalGold ??
    0
  );
}

export function teamGold(
  team: LoLGameParticipantDto[],
  timeline: LoLGameTimelineFrame[] | undefined,
): number {
  if (team.length > 0 && team.every((p) => p.stats != null)) {
    return team.reduce((sum, p) => sum + (p.stats?.goldEarned ?? 0), 0);
  }

  const frame = latestFrame(timeline);
  if (frame != null) {
    return team.reduce(
      (sum, p) => sum + (frameStatsFor(frame, p.puuid)?.totalGold ?? 0),
      0,
    );
  }

  return team.reduce((sum, p) => sum + (p.stats?.goldEarned ?? 0), 0);
}

export function killParticipationFor(
  player: LoLGameParticipantDto,
  team: LoLGameParticipantDto[],
): number {
  if (player.challenges != null) {
    return Math.round(player.challenges.killParticipation * 100);
  }

  return Math.round(
    player.stats?.killParticipationPercent ?? killParticipation(player, team),
  );
}

export function damageToChampionsFor(
  player: LoLGameParticipantDto,
  timeline: LoLGameTimelineFrame[] | undefined,
): number {
  return (
    player.stats?.damageDealtToChampions ??
    latestStatsFor(timeline, player.puuid)?.totalDamageDoneToChampions ??
    0
  );
}

export interface DamageSplit {
  physical: number;
  magic: number;
  trueDamage: number;
}

export function damageSplitFor(
  player: LoLGameParticipantDto,
  timeline: LoLGameTimelineFrame[] | undefined,
): DamageSplit | null {
  const apiPhysical = player.stats?.physicalDamageToChampions ?? 0;
  const apiMagic = player.stats?.magicDamageToChampions ?? 0;
  const apiTrue = player.stats?.trueDamageToChampions ?? 0;

  if (apiPhysical + apiMagic + apiTrue > 0) {
    return { physical: apiPhysical, magic: apiMagic, trueDamage: apiTrue };
  }

  const stats = latestStatsFor(timeline, player.puuid);
  const physical = stats?.physicalDamageDoneToChampions ?? 0;
  const magic = stats?.magicDamageDoneToChampions ?? 0;
  const trueDamage = stats?.trueDamageDoneToChampions ?? 0;

  return physical + magic + trueDamage > 0
    ? { physical, magic, trueDamage }
    : null;
}

export function crowdControlSecondsFor(
  player: LoLGameParticipantDto,
  timeline: LoLGameTimelineFrame[] | undefined,
): number {
  const apiValue = player.stats?.timeCcOthersSeconds ?? 0;
  if (apiValue > 0) {
    return Math.round(apiValue);
  }

  return Math.round(
    (latestStatsFor(timeline, player.puuid)?.timeEnemySpentControlled ?? 0) /
      1000,
  );
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function playerRating(
  player: LoLGameParticipantDto,
  team: LoLGameParticipantDto[],
  timeline: LoLGameTimelineFrame[] | undefined,
  durationSeconds: number,
): number {
  const teamDamage = team.reduce(
    (sum, p) => sum + damageToChampionsFor(p, timeline),
    0,
  );
  const damageShare =
    player.challenges?.teamDamagePercentage ??
    (teamDamage > 0 ? damageToChampionsFor(player, timeline) / teamDamage : 0);

  const minutes = durationSeconds > 0 ? durationSeconds / 60 : 0;
  const goldPerMinute =
    player.stats?.goldPerMinute ??
    (minutes > 0 ? goldEarnedFor(player, timeline) / minutes : 0);

  const kdaPart = clamp01(kda(player) / 6);
  const kpPart = clamp01(killParticipationFor(player, team) / 65);
  const damagePart = clamp01(damageShare / 0.3);
  const goldPart = clamp01(goldPerMinute / 500);
  const survivalPart = clamp01(1 - player.deaths / 12);

  const rating =
    10 *
      (kdaPart * 0.25 +
        kpPart * 0.2 +
        damagePart * 0.25 +
        goldPart * 0.15 +
        survivalPart * 0.15) +
    (player.win ? 0.4 : 0);

  return Math.min(10, Math.max(0, rating));
}

export function ratingFor(
  player: LoLGameParticipantDto,
  team: LoLGameParticipantDto[],
  timeline: LoLGameTimelineFrame[] | undefined,
  durationSeconds: number,
): number {
  const apiRating = player.stats?.rating ?? 0;
  if (apiRating > 0) {
    return apiRating;
  }

  return playerRating(player, team, timeline, durationSeconds);
}

export function ratingToneClass(rating: number): string {
  if (rating >= 9) return 'text-mpYellowInk border-mpYellow/45 bg-mpYellow/15';
  if (rating >= 6.5) return 'text-mpGreenInk border-mpGreen/45 bg-mpGreen/15';
  if (rating >= 5) return 'text-mpBlueInk border-mpBlue/45 bg-mpBlue/15';
  return 'text-mpTextSecondary border-mpBorder bg-white/5';
}

export function compositeScore(
  player: LoLGameParticipantDto,
  timeline: LoLGameTimelineFrame[] | undefined,
): number {
  return (
    player.kills * 3 +
    player.assists * 1.5 -
    player.deaths +
    damageToChampionsFor(player, timeline) / 1000 +
    goldEarnedFor(player, timeline) / 1000
  );
}

export function bestParticipant(
  participants: LoLGameParticipantDto[],
  valueFn: (p: LoLGameParticipantDto) => number,
): { player: LoLGameParticipantDto; value: number } | undefined {
  if (participants.length === 0) {
    return undefined;
  }

  return participants
    .map((player) => ({ player, value: valueFn(player) }))
    .sort((a, b) => b.value - a.value)[0];
}

export function playerDisplayName(player: LoLGameParticipantDto): string {
  return player.player?.nickname || player.riotIdGameName || 'Joueur inconnu';
}

export function playerFullName(player: LoLGameParticipantDto): string {
  const riotName = player.riotIdGameName || 'Joueur inconnu';
  const nickname = player.player?.nickname;

  return nickname && nickname !== riotName
    ? `${nickname} (${riotName})`
    : riotName;
}

export function isLinkedToGameOn(player: LoLGameParticipantDto): boolean {
  return player.player != null;
}

export function gameDurationSeconds(game: LoLGameDto): number {
  const start = new Date(game.gameStart).getTime();
  const end = new Date(game.gameEnd).getTime();
  const seconds = (end - start) / 1000;
  return Number.isNaN(seconds) || seconds <= 0 ? 0 : seconds;
}

export function durationSecondsFor(game: LoLGameDto): number {
  const fromStats = game.leagueOfLegendsGameParticipants.find(
    (p) => (p.stats?.gameDurationSeconds ?? 0) > 0,
  )?.stats?.gameDurationSeconds;

  return fromStats ?? gameDurationSeconds(game);
}

export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(ms: number): string {
  return formatDuration(ms / 1000);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return decimalLabel(value / 1000, 1) + 'k';
  }

  return Math.round(value).toString();
}

export function formatFull(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value));
}

export const LOL_DISPLAY_TIMEZONE = 'Europe/Paris';

export function parseApiDate(date: Date | string): Date {
  if (date instanceof Date) {
    return date;
  }

  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(date);
  return new Date(hasTimezone ? date : `${date}Z`);
}

export function formatDateTime(date: Date | string): string {
  const parsedDate = parseApiDate(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date inconnue';
  }

  const datePart = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: LOL_DISPLAY_TIMEZONE,
  }).format(parsedDate);

  const timePart = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: LOL_DISPLAY_TIMEZONE,
  }).format(parsedDate);

  return `${datePart} à ${timePart}`;
}

export function formatShortDateTime(date: Date | string): string {
  const parsedDate = parseApiDate(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date inconnue';
  }

  const datePart = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: LOL_DISPLAY_TIMEZONE,
  }).format(parsedDate);

  const timePart = new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: LOL_DISPLAY_TIMEZONE,
  }).format(parsedDate);

  return `${datePart} à ${timePart}`;
}

export function gameDayKeyMatch(date: Date | string): string {
  const parsedDate = parseApiDate(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'unknown';
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LOL_DISPLAY_TIMEZONE,
  }).format(parsedDate);
}

export function formatDayLabelMatch(date: Date | string): string {
  const parsedDate = parseApiDate(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date inconnue';
  }

  const todayKey = gameDayKeyMatch(new Date());
  const parsedKey = gameDayKeyMatch(parsedDate);

  if (parsedKey === todayKey) {
    return "Aujourd'hui";
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (parsedKey === gameDayKeyMatch(yesterday)) {
    return 'Hier';
  }

  const label = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: LOL_DISPLAY_TIMEZONE,
  }).format(parsedDate);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatRelativeDate(date: Date | string): string {
  const diffMs = Date.now() - parseApiDate(date).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;

  const months = Math.floor(days / 30);
  if (months < 12) return `il y a ${months} mois`;

  const years = Math.floor(months / 12);
  return `il y a ${years} an${years > 1 ? 's' : ''}`;
}
