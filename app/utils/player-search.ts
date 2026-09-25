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
export const normalizeSearchText = (value: string): string =>
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
  const needle = normalizeSearchText(query)
  if (!needle) return null

  const exact = players.find(player => candidateNames(player).some(name => normalizeSearchText(name) === needle))
  if (exact) return exact

  return players.find(player => candidateNames(player).some(name => normalizeSearchText(name).includes(needle))) ?? null
}

/**
 * Every player matching the query, exact matches first, the given order kept otherwise. An empty
 * query matches everyone. Feeds the search palette, which lists candidates as the user types rather
 * than jumping to a single one.
 */
export const filterPlayersByName = <T extends LeaguePlayer>(players: T[], query: string): T[] => {
  const needle = normalizeSearchText(query)
  if (!needle) return players

  const names = (player: T) => candidateNames(player).map(normalizeSearchText)
  const matching = players.filter(player => names(player).some(name => name.includes(needle)))
  const exact = matching.filter(player => names(player).some(name => name === needle))
  return [...exact, ...matching.filter(player => !exact.includes(player))]
}
