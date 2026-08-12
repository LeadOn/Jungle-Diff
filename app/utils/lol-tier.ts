import type { LeagueOfLegendsRank } from '~/lib/types'

export const APEX_TIERS = new Set(['MASTER', 'GRANDMASTER', 'CHALLENGER'])

export function tierLabel(rank?: LeagueOfLegendsRank | null): string {
  if (!rank) return 'Non classé'
  const tierStr = rank.tier ? rank.tier.toLowerCase() : ''
  const capitalizedTier = tierStr.charAt(0).toUpperCase() + tierStr.slice(1)
  
  if (APEX_TIERS.has(rank.tier.toUpperCase())) {
    return capitalizedTier
  }
  
  return `${capitalizedTier} ${rank.rank}`
}

export function tierEmblemUrl(rank?: LeagueOfLegendsRank | null): string {
  const t = rank ? rank.tier.toLowerCase() : 'unranked'
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${t}.png`
}

export function tierGlowShadow(rank?: LeagueOfLegendsRank | null): string {
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

export function tierGlowBackground(rank?: LeagueOfLegendsRank | null): string {
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
