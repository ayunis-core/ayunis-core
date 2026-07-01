/**
 * Number of questions drawn (at random) from a chapter's pool for a single
 * quiz attempt. If the pool holds fewer than this, the whole pool is drawn.
 */
export const DRAWN_QUESTION_COUNT = 10;

/**
 * Number of correct answers required to pass, given the number of questions
 * asked and the chapter's pass threshold (percent). Rounds up so, e.g., an
 * 80% threshold over 10 questions requires 8, and over 7 questions requires 6.
 */
export function requiredCorrect(total: number, thresholdPct: number): number {
  return Math.ceil((total * thresholdPct) / 100);
}
