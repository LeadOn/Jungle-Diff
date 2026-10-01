import type { LoLCustomGameImportPayload } from '~/lib/types'

/**
 * Reading the files `scripts/fetch_custom_games_lcu.py` (GameOn-API repository) dumps for a custom
 * game, into the body of `POST /lol/match/custom/import`.
 *
 * The script writes the game as `<matchId>.json` and its timeline beside it as
 * `<matchId>.timeline.json`, both in the League client's own shape. Either can be dropped, alone or
 * together, and so can the `{ game, timeline }` body the script itself posts. Only the outline is
 * checked here — the API maps the payload and answers `400` on anything it cannot read.
 */

/** Kestrel refuses bodies over 30 MB; a real game and its timeline weigh a few MB at most. */
const MAX_TOTAL_BYTES = 25 * 1024 * 1024

type JsonObject = Record<string, unknown>

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isGame = (value: unknown): value is JsonObject =>
  isObject(value) && 'gameId' in value && Array.isArray(value.participants)

const isTimeline = (value: unknown): value is JsonObject =>
  isObject(value) && Array.isArray(value.frames)

export type CustomGameRead =
  | { ok: true, payload: LoLCustomGameImportPayload, matchId: string | null }
  | { ok: false, error: string }

/** `EUW1_7234880012`, read from the game before it is sent, so the admin sees what they picked. */
export function customGameMatchId(game: JsonObject): string | null {
  const platform = typeof game.platformId === 'string' ? game.platformId.toUpperCase() : null
  const id = typeof game.gameId === 'number' || typeof game.gameId === 'string' ? String(game.gameId) : null
  return platform && id ? `${platform}_${id}` : null
}

export async function readCustomGameFiles(files: File[]): Promise<CustomGameRead> {
  if (files.length === 0) return { ok: false, error: 'Aucun fichier sélectionné.' }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) {
    return { ok: false, error: 'Fichiers trop volumineux : 25 Mo au plus.' }
  }

  let game: JsonObject | null = null
  let timeline: JsonObject | null = null

  for (const file of files) {
    let content: unknown
    try {
      content = JSON.parse(await file.text())
    } catch {
      return { ok: false, error: `${file.name} n'est pas un JSON valide.` }
    }

    if (isObject(content) && isGame(content.game)) {
      if (game) return { ok: false, error: 'Plusieurs parties dans la sélection : importez-les une par une.' }
      game = content.game
      if (isTimeline(content.timeline)) timeline = content.timeline
    } else if (isGame(content)) {
      if (game) return { ok: false, error: 'Plusieurs parties dans la sélection : importez-les une par une.' }
      game = content
    } else if (isTimeline(content)) {
      if (timeline) return { ok: false, error: 'Plusieurs timelines dans la sélection.' }
      timeline = content
    } else {
      return { ok: false, error: `${file.name} ne ressemble ni à une partie ni à une timeline du client LoL.` }
    }
  }

  if (!game) return { ok: false, error: 'Une timeline seule ne suffit pas : ajoutez le fichier de la partie.' }

  return { ok: true, payload: { game, timeline }, matchId: customGameMatchId(game) }
}
