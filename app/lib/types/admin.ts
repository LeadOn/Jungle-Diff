import type { PlayerDto } from './home'
import type { LeaguePlayer } from './player'

/**
 * An account as the admin space reads it: `GET /lol/summoner` with every flag opened
 * (`includeOutOfCrew=true`, once per `archived` value). The payload is the crew list's, plus the
 * fields the crew-facing `LeaguePlayer` leaves out because no public page needs them.
 */
export interface LoLAdminAccountDto extends LeaguePlayer {
  /** Set once the owner has signed in through Keycloak; smurfs never have one. */
  keycloakId: string | null
  /** Crew accounts are refreshed every 20 min and counted by the ladders and the stats. */
  inCrew: boolean
  archived: boolean
  createdOn: string // ISO 8601 UTC
}

/** The bare `Player` entity several admin routes answer with: identity only, no rank, no stats. */
export interface GameOnPlayerDto extends PlayerDto {
  inCrew: boolean
}

/**
 * Body of `PATCH /Player` (admin only). The API **overwrites** `fullName`, `nickname`, `keycloakId`
 * and `archived` from it, so it must always carry the whole account: a partial body detaches the
 * account from its Keycloak user or blanks its name. `fullName` and `nickname` are required non-empty
 * by the API's model validation.
 */
export interface UpdatePlayerDto {
  id: number
  keycloakId: string | null
  fullName: string
  nickname: string
  archived: boolean
  riotGamesNickname: string | null
  riotGamesTagLine: string | null
}

/** `PATCH /lol/summoner/{id}/crew`. */
export interface LoLSetCrewMembershipResultDto {
  account: GameOnPlayerDto
  /**
   * Smurfs taken out along with their main. Only ever non-zero when a main leaves the crew: putting
   * it back does not bring them back, on purpose.
   */
  affectedSmurfAccounts: number
}

/** `POST /lol/summoner/{id}/smurfs`, on success. Failures answer 404 / 409 with a plain message. */
export interface LoLLinkSmurfAccountResultDto {
  status: number | string
  smurfAccount: GameOnPlayerDto | null
  /** Past participations re-attached to the smurf: games imported before its PUUID was known. */
  backfilledParticipations: number
}

/** `POST /lol/match/rank-changes/recompute`. Reads nothing from Riot, only the stored snapshots. */
export interface LoLRecomputeRankChangesResultDto {
  participationsScanned: number
  participationsWithRankChange: number
  created: number
  updated: number
  removed: number
}

/**
 * Body of `POST /lol/match/custom/import`: the game and its timeline as the League client serves
 * them (`scripts/fetch_custom_games_lcu.py` in the API repository dumps both). The shapes are the
 * client's legacy match-v4 ones, mapped server-side: the front end only checks it holds a game.
 */
export interface LoLCustomGameImportPayload {
  game: Record<string, unknown>
  timeline: Record<string, unknown> | null
}

export interface LoLImportCustomGameResultDto {
  matchId: string
  /** The game was already stored and got replaced. */
  replaced: boolean
  gameStart: string // ISO 8601 UTC
  queueId: number | null
  participantCount: number
  linkedPlayerCount: number
  timelineFrameCount: number
  /** Riot IDs of the participants no GameOn player matched. */
  unlinkedRiotIds: string[]
}
