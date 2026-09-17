import type { LeaguePlayer } from '~/lib/types'

/**
 * Resolving a player by name.
 *
 * The GameOn API exposes **no** name search: the only profile route is
 * `GET /lol/summoner/{id:int}`. The search bar nevertheless pushed to `/summoner/<nickname>`, so
 * every search ended on "Invocateur introuvable". Since the crew is a closed set of players already
 * loaded for the ladder, the name is resolved locally instead.
 */

/** Lowercase, accent-free, trimmed — so we compare what people actually type. */
const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

const candidateNames = (player: LeaguePlayer): string[] => {
  const riotId = player.riotGamesNickname && player.riotGamesTagLine
    ? `${player.riotGamesNickname}#${player.riotGamesTagLine}`
    : null

  return [player.riotGamesNickname, riotId, player.nickname, player.fullName]
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
}

/**
 * Finds the player matching the query. An exact match always wins over a partial one, so a short
 * nickname is not captured by a longer one that happens to contain it.
 */
export const findPlayerByName = (players: LeaguePlayer[], query: string): LeaguePlayer | null => {
  const needle = normalize(query)
  if (!needle) return null

  const exact = players.find(player => candidateNames(player).some(name => normalize(name) === needle))
  if (exact) return exact

  return players.find(player => candidateNames(player).some(name => normalize(name).includes(needle))) ?? null
}
