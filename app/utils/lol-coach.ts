/**
 * A coach wait as the reader takes it in. Below ~90 s the seconds say something a minute count
 * cannot: "~40 s" is a wait you sit through, "~1 min" is not. Above it, minutes read better than a
 * three-digit second count. Values are rounded to 5 s steps so a moving server-side estimate does not
 * flicker digit by digit.
 */
export function formatCoachWait(seconds: number): string {
  if (seconds < 90) return `~${Math.max(5, Math.round(seconds / 5) * 5)} s`
  return `~${Math.round(seconds / 60)} min`
}
