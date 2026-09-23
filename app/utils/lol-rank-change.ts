import type { LoLGameParticipantRankChange } from '~/lib/types'
import type { RankPosition } from '~/utils/lol-tier'
import { divisionScore, tierLabel } from '~/utils/lol-tier'

export type LpDeltaTone = 'gain' | 'loss' | 'neutral'
export type RankTransition = 'promotion' | 'demotion'

export function rankBefore(change: LoLGameParticipantRankChange): RankPosition {
  return { tier: change.tierBefore, rank: change.rankBefore, leaguePoints: change.leaguePointsBefore }
}

export function rankAfter(change: LoLGameParticipantRankChange): RankPosition {
  return { tier: change.tierAfter, rank: change.rankAfter, leaguePoints: change.leaguePointsAfter }
}

/** "+18", "-21", "0". */
export function formatSignedLp(lp: number): string {
  return lp > 0 ? `+${lp}` : `${lp}`
}

/** "+18 LP", "-21 LP", "0 LP". A 0 is a real result (a loss under demotion protection), not a gap. */
export function formatLpDelta(lp: number): string {
  return `${formatSignedLp(lp)} LP`
}

export function lpDeltaTone(lp: number): LpDeltaTone {
  if (lp > 0) return 'gain'
  if (lp < 0) return 'loss'
  return 'neutral'
}

/** "Emerald II 27 LP", or "Master 112 LP" — the division is dropped from Master upwards. */
export function rankPositionLabel(rank: RankPosition): string {
  return `${tierLabel(rank)} ${rank.leaguePoints} LP`
}

/** "Emerald II 27 LP → Emerald II 45 LP" */
export function rankChangeSummary(change: LoLGameParticipantRankChange): string {
  return `${rankPositionLabel(rankBefore(change))} → ${rankPositionLabel(rankAfter(change))}`
}

/**
 * "Emerald II 27 → 45 LP (+18)" when the game stayed within one division, otherwise both ends in
 * full: "Emerald IV 87 LP → Emerald III 6 LP (+19)".
 */
export function rankChangeShortSummary(change: LoLGameParticipantRankChange): string {
  const before = rankBefore(change)
  const after = rankAfter(change)
  const delta = `(${formatSignedLp(change.leaguePointsChange)})`
  const fromLabel = tierLabel(before)
  if (fromLabel === tierLabel(after)) {
    return `${fromLabel} ${before.leaguePoints} → ${after.leaguePoints} LP ${delta}`
  }
  return `${rankChangeSummary(change)} ${delta}`
}

/**
 * Mean LP moved over the games won (`win = true`) or lost, rounded to the unit. Games whose LP are
 * unknown are left out rather than counted as 0, which would drag both means towards zero. `null`
 * when no game qualifies.
 */
export function averageLpChange(
  games: { win: boolean, rankChange: LoLGameParticipantRankChange | null }[],
  win: boolean,
): number | null {
  const known = games.flatMap(g => (g.win === win && g.rankChange ? [g.rankChange.leaguePointsChange] : []))
  if (known.length === 0) return null
  return Math.round(known.reduce((sum, lp) => sum + lp, 0) / known.length)
}

/**
 * Whether the game moved the player to another division or tier, and which way. Compared on the
 * division alone, not on LP: a promotion from Gold I 90 LP to Platinum IV 10 LP drops the LP figure
 * while climbing. `null` when the division did not change, or when either tier is unknown — an
 * unexpected value is not evidence of a promotion.
 */
export function rankTransition(change: LoLGameParticipantRankChange): RankTransition | null {
  const from = divisionScore(rankBefore(change))
  const to = divisionScore(rankAfter(change))
  if (from === null || to === null || from === to) return null
  return to > from ? 'promotion' : 'demotion'
}
