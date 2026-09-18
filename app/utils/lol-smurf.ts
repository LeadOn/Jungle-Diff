/** The shape the predicate actually needs, so participants can be tested as well as ladder rows. */
interface SmurfCandidate {
  id: number
  primaryPlayerId?: number | null
}

/**
 * A secondary account.
 *
 * Both extra guards are load-bearing and neither is decorative: the API returns `primaryPlayerId`
 * pointing at the account itself for some main accounts, and `0` for others, so the short
 * `!!primaryPlayerId` form crowns real mains as smurfs. Kept in one place so the ladder and the docs
 * cannot drift apart; the recent-games list asks the API instead of re-deriving it here.
 */
export function isSmurf(player: SmurfCandidate): boolean {
  const primary = player.primaryPlayerId
  return !!primary && primary !== player.id && primary !== 0
}
