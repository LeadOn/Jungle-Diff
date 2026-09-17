/**
 * Report written by the coach the interface calls "rAImmus".
 *
 * The persona lives in the UI labels only: the API side stays neutral (`/lol/coach/...`) and the
 * generated text itself carries no character, so renaming the coach never touches a contract.
 */
export interface LoLCoachAxisDto {
  titre: string;
  explication: string;
  actionConcrete: string;
}

export interface LoLCoachAnalysisDto {
  synthese: string;
  /** Legitimately empty when the game holds nothing positive: the coach never invents one. */
  pointsForts: string[];
  axesProgression: LoLCoachAxisDto[];
  /**
   * Editorial mark, written by the model. It is **not** `LoLGameParticipantStat.Rating`, which is
   * computed and reproducible: the two can diverge by several points on the same game, so this one
   * is only ever rendered as rAImmus' own opinion.
   */
  noteSur10: number;
}

export interface LoLCoachReportDto {
  matchId: string;
  playerId: number | null;
  analysis: LoLCoachAnalysisDto;
  modelName: string | null;
  generatedOn: string; // ISO 8601 UTC
}

/**
 * Acknowledgement returned with a `202` by both coach routes: the analysis is not written yet, it
 * is waiting its turn.
 *
 * Generation takes around 50 s and the model's free tier caps at 5 requests per minute, so the API
 * serialises the work behind a single consumer instead of holding a connection open per caller.
 * Requests are deduplicated on `(matchId, playerId)`: clicking twice returns the existing slot.
 */
export interface LoLCoachQueueStatusDto {
  matchId: string;
  playerId: number;
  /** Place in the queue, 1 meaning this analysis is the one being written right now. */
  position: number;
  /** Total number of analyses waiting, the one in progress included. */
  queueLength: number;
  /**
   * Estimated wait before **this** report becomes readable, its own generation included.
   *
   * Computed server-side from a rolling average of the last ten real generations, so it moves from
   * one poll to the next. Render it as it arrives rather than freezing the first value read.
   */
  estimatedWaitSeconds: number;
  enqueuedOn: string; // ISO 8601 UTC
}
