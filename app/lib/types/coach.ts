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
