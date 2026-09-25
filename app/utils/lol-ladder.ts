import type { LeaguePlayer, LeagueOfLegendsRank } from '~/lib/types'
import { compareRanksDesc, divisionScore, rankScore } from '~/utils/lol-tier'
import { isSmurf } from '~/utils/lol-smurf'
import { computeWinRate } from '~/utils/number'

export type LadderQueue = 'solo' | 'flex'

export interface LadderEntry {
  id: number
  name: string
  tag: string
  iconId: number | null
  smurf: boolean
  /** The main account's name, for a smurf. */
  mainName: string | null
  /** Most played champion over the last rolling month (`mainChampionName`), `null` when none. */
  mainChampion: string | null
  rank: LeagueOfLegendsRank | null
  /** Position on the continuous `rankScore` axis, `null` when unranked. */
  score: number | null
  /** LP moved over the last 7 days in this queue. */
  delta: number
  form: boolean[]
  winRate: number | null
  /** 1-based place among the ranked, `null` when unranked. */
  position: number | null
  /** LP behind the player just above, `null` for the leader and the unranked. */
  gap: number | null
  previousName: string | null
}

export interface Ladder {
  ranked: LadderEntry[]
  unranked: LadderEntry[]
  /** Accounts shown once the smurf filter applies, ranked or not. */
  visibleCount: number
}

export const playerDisplayName = (player: Pick<LeaguePlayer, 'riotGamesNickname' | 'nickname'>): string =>
  player.riotGamesNickname || player.nickname

/**
 * The crew's ladder for one queue: the ranked sorted best first, then the unranked.
 *
 * The smurf filter is applied here, on the view, and never on the store: `useLolStore().players`
 * must keep every account (see the pitfalls on "inclure les smurfs"). A rank whose tier is unknown
 * to `lol-tier.ts` counts as unranked rather than being placed at the bottom of Iron.
 */
export function buildLadder(players: LeaguePlayer[], queue: LadderQueue, includeSmurfs: boolean): Ladder {
  const byId = new Map(players.map(player => [player.id, player]))

  const entries = players
    .filter(player => includeSmurfs || !isSmurf(player))
    .map((player): LadderEntry => {
      const rawRank = queue === 'solo' ? player.leagueOfLegendsSoloRank : player.leagueOfLegendsFlexRank
      const rank = rawRank && divisionScore(rawRank) !== null ? rawRank : null
      const smurf = isSmurf(player)
      const main = smurf && player.primaryPlayerId ? byId.get(player.primaryPlayerId) : undefined

      return {
        id: player.id,
        name: playerDisplayName(player),
        tag: player.riotGamesTagLine ? `#${player.riotGamesTagLine}` : '',
        iconId: player.lolIconId,
        smurf,
        mainName: main ? playerDisplayName(main) : null,
        mainChampion: player.mainChampionName ?? null,
        rank,
        score: rank ? rankScore(rank) : null,
        delta: (queue === 'solo' ? player.lpChange7DaysSolo : player.lpChange7DaysFlex) ?? 0,
        form: rank ? (queue === 'solo' ? player.recentFormSolo : player.recentFormFlex) ?? [] : [],
        winRate: rank ? computeWinRate(rank.wins, rank.losses) : null,
        position: null,
        gap: null,
        previousName: null,
      }
    })

  const ranked = entries
    .filter(entry => entry.rank)
    .sort((a, b) => compareRanksDesc(a.rank!, b.rank!))
    .map((entry, index, list) => {
      const previous = index > 0 ? list[index - 1] : undefined
      return {
        ...entry,
        position: index + 1,
        gap: previous ? Math.max(0, (previous.score ?? 0) - (entry.score ?? 0)) : null,
        previousName: previous?.name ?? null,
      }
    })

  return {
    ranked,
    unranked: entries.filter(entry => !entry.rank),
    visibleCount: entries.length,
  }
}
