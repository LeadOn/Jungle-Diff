import type { LeaguePlayer, LoLGameDto, LoLGameParticipantDto } from '~/lib/types'
import { isSmurf } from '~/utils/lol-smurf'
import { parisDayKey } from '~/utils/date'

/** One card of the home feed: a game, told from the point of view of one crew member. */
export interface FeedEntry {
  key: string
  game: LoLGameDto
  participant: LoLGameParticipantDto
  /** The other crew members of the same game. */
  teammates: LoLGameParticipantDto[]
  dayKey: string
}

export const RANKED_QUEUE_IDS = new Set([420, 440])

const participantIsSmurf = (participant: LoLGameParticipantDto): boolean =>
  participant.playerId !== null && isSmurf({ id: participant.playerId, primaryPlayerId: participant.player?.primaryPlayerId })

/**
 * The crew members of a game. A tracked participant is only kept when the crew list knows them (the
 * list is crew-only), so an out-of-crew player tracked by the API never passes for one of ours;
 * until the list is loaded, a non-null `playerId` is all there is to go on.
 */
export function crewParticipants(game: LoLGameDto, crew: LeaguePlayer[]): LoLGameParticipantDto[] {
  const crewIds = new Set(crew.map(player => player.id))
  return game.leagueOfLegendsGameParticipants.filter(participant =>
    participant.playerId !== null && (crewIds.size === 0 || crewIds.has(participant.playerId)))
}

/**
 * Turns a page of games into feed entries. With `playerId`, each game is that player's; otherwise it
 * is the first crew member's — a main account first when smurfs are excluded, since
 * `/lol/Match/last` keeps a game where a smurf played beside a main, and it is the main's game.
 */
export function buildFeed(
  games: LoLGameDto[],
  crew: LeaguePlayer[],
  options: { playerId?: number | null, includeSmurfs: boolean },
): FeedEntry[] {
  return games.flatMap((game) => {
    const members = crewParticipants(game, crew)
    const eligible = options.includeSmurfs ? members : members.filter(member => !participantIsSmurf(member))
    const participant = options.playerId != null
      ? game.leagueOfLegendsGameParticipants.find(member => member.playerId === options.playerId)
      : eligible[0] ?? members[0]
    if (!participant) return []

    return [{
      key: game.matchId,
      game,
      participant,
      teammates: eligible.filter(member => member !== participant),
      dayKey: parisDayKey(game.gameStart),
    }]
  })
}

/** Crew members appearing in the games, in order of first appearance: the feed's filter chips. */
export function feedPlayers(games: LoLGameDto[], crew: LeaguePlayer[], includeSmurfs: boolean): LeaguePlayer[] {
  const byId = new Map(crew.map(player => [player.id, player]))
  const seen = new Set<number>()
  const result: LeaguePlayer[] = []
  for (const game of games) {
    for (const participant of crewParticipants(game, crew)) {
      const player = participant.playerId !== null ? byId.get(participant.playerId) : undefined
      if (!player || seen.has(player.id) || (!includeSmurfs && isSmurf(player))) continue
      seen.add(player.id)
      result.push(player)
    }
  }
  return result
}
