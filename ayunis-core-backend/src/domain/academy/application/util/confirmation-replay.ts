// Completing the academy clears page time, so a retried final confirmation
// (lost response, double submit) would otherwise fail the minimum-time check.
// Renewals happen months later and still need the time again.
const CONFIRMATION_REPLAY_WINDOW_MS = 5 * 60 * 1000;

export function isConfirmationReplayable(
  confirmedAt: Date,
  now: Date,
): boolean {
  return now.getTime() - confirmedAt.getTime() < CONFIRMATION_REPLAY_WINDOW_MS;
}
