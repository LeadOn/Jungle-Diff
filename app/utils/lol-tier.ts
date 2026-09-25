import type { LeagueOfLegendsRank } from '~/lib/types'

export const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER'])

const TIER_BASE_POINTS: Record<string, number> = {
  IRON: 0, BRONZE: 400, SILVER: 800, GOLD: 1200, PLATINUM: 1600,
  EMERALD: 2000, DIAMOND: 2400, MASTER: 2800, GRANDMASTER: 3200, CHALLENGER: 3600,
}
const DIVISION_POINTS: Record<string, number> = { I: 300, II: 200, III: 100, IV: 0 }

/**
 * The part of a rank these helpers read. A full `LeagueOfLegendsRank` satisfies it, and so does a
 * position rebuilt from a match's `rankChange`, which carries no queue, wins or losses.
 */
export type RankPosition = Pick<LeagueOfLegendsRank, 'tier' | 'rank' | 'leaguePoints'>

/**
 * Places a tier + division on the ladder, ignoring LP — two ranks with the same score are the same
 * division. The division is ignored from Master upwards, where it carries no meaning. `null` for a
 * tier this table does not know, so an unexpected value is never mistaken for Iron.
 */
export function divisionScore(rank: Pick<RankPosition, 'tier' | 'rank'>): number | null {
  const tier = rank.tier ? rank.tier.toUpperCase() : ''
  const division = rank.rank ? rank.rank.toUpperCase() : ''
  const base = TIER_BASE_POINTS[tier]
  if (base === undefined) return null
  const divisionPoints = APEX_TIERS.has(tier) ? 0 : (DIVISION_POINTS[division] ?? 0)
  return base + divisionPoints
}

/**
 * Converts a rank (tier + division + LP) into a continuous numeric score, used to plot
 * progression (e.g. the LP sparkline) on a single axis.
 */
export function rankScore(rank: RankPosition): number {
  return (divisionScore(rank) ?? 0) + rank.leaguePoints
}

export function tierLabel(rank?: Pick<RankPosition, 'tier' | 'rank'> | null): string {
  if (!rank) return 'Non classé'
  const tierStr = rank.tier ? rank.tier.toLowerCase() : ''
  const capitalizedTier = tierStr.charAt(0).toUpperCase() + tierStr.slice(1)
  
  if (APEX_TIERS.has(rank.tier.toUpperCase())) {
    return capitalizedTier
  }
  
  return `${capitalizedTier} ${rank.rank}`
}

export function tierEmblemUrl(rank?: Pick<RankPosition, 'tier'> | null): string {
  const t = rank ? rank.tier.toLowerCase() : 'unranked'
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${t}.png`
}

export function tierGlowShadow(rank?: Pick<RankPosition, 'tier'> | null): string {
  if (!rank) return 'none'
  
  switch (rank.tier.toUpperCase()) {
    case 'IRON': return 'drop-shadow(0 0 12px rgba(110, 100, 95, 0.65))'
    case 'BRONZE': return 'drop-shadow(0 0 12px rgba(158, 103, 76, 0.65))'
    case 'SILVER': return 'drop-shadow(0 0 12px rgba(162, 178, 187, 0.65))'
    case 'GOLD': return 'drop-shadow(0 0 12px rgba(228, 184, 94, 0.65))'
    case 'PLATINUM': return 'drop-shadow(0 0 12px rgba(112, 182, 172, 0.65))'
    case 'EMERALD': return 'drop-shadow(0 0 12px rgba(96, 179, 115, 0.65))'
    case 'DIAMOND': return 'drop-shadow(0 0 12px rgba(133, 163, 237, 0.65))'
    case 'MASTER': return 'drop-shadow(0 0 12px rgba(198, 114, 219, 0.65))'
    case 'GRANDMASTER': return 'drop-shadow(0 0 12px rgba(234, 111, 104, 0.65))'
    case 'CHALLENGER': return 'drop-shadow(0 0 12px rgba(233, 201, 137, 0.65))'
    default: return 'none'
  }
}

export function tierGlowBackground(rank?: Pick<RankPosition, 'tier'> | null): string {
  if (!rank) return 'transparent'
  
  switch (rank.tier.toUpperCase()) {
    case 'IRON': return 'rgba(110, 100, 95, 0.15)'
    case 'BRONZE': return 'rgba(158, 103, 76, 0.15)'
    case 'SILVER': return 'rgba(162, 178, 187, 0.15)'
    case 'GOLD': return 'rgba(228, 184, 94, 0.15)'
    case 'PLATINUM': return 'rgba(112, 182, 172, 0.15)'
    case 'EMERALD': return 'rgba(96, 179, 115, 0.15)'
    case 'DIAMOND': return 'rgba(133, 163, 237, 0.15)'
    case 'MASTER': return 'rgba(198, 114, 219, 0.15)'
    case 'GRANDMASTER': return 'rgba(234, 111, 104, 0.15)'
    case 'CHALLENGER': return 'rgba(233, 201, 137, 0.15)'
    default: return 'transparent'
  }
}

/** Tiers from the bottom of the ladder up, each 400 points wide on the `rankScore` axis. */
export const TIER_ORDER = [
  'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER',
] as const

export const TIER_SPAN = 400

const TIER_TINTS: Record<string, string> = {
  IRON: '#C9BFB6',
  BRONZE: '#F1B48A',
  SILVER: '#CBD4E1',
  GOLD: '#E3B54F',
  PLATINUM: '#7EE8D6',
  EMERALD: '#5BE3A1',
  DIAMOND: '#9DB2FF',
  MASTER: '#DA9BFF',
  GRANDMASTER: '#FF8C8C',
  CHALLENGER: '#8EDCFF',
}

/**
 * The pastel each tier is drawn with on the dashboard (rank chips, the bands of the rank scale).
 * Data colours rather than theme tokens: a tier keeps its hue in both themes.
 */
export function tierTint(tier?: string | null): string | null {
  return tier ? TIER_TINTS[tier.toUpperCase()] ?? null : null
}

/**
 * Orders two positions best first: division, then LP. Sorting on `rankScore` alone would misplace
 * the apex tiers, where LP are unbounded — a Master on 500 LP would otherwise tie a Grandmaster on
 * 100.
 */
export function compareRanksDesc(a: RankPosition, b: RankPosition): number {
  return ((divisionScore(b) ?? -1) - (divisionScore(a) ?? -1)) || (b.leaguePoints - a.leaguePoints)
}
