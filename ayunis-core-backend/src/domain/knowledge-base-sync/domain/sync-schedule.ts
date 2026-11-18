import { findProviderOutage } from 'src/common/errors/find-provider-outage.helper';

/** A location syncs again this long after its last sync ended. */
export const SYNC_INTERVAL_MS = 60 * 60 * 1000;

/**
 * The shortest pause: a `Retry-After` of zero or in the past would otherwise
 * retry at once, again and again, with no attempt spent.
 */
const MIN_PAUSE_MS = 1000;
const FIRST_OUTAGE_PAUSE_MS = 60 * 1000;
const MAX_OUTAGE_PAUSE_MS = 60 * 60 * 1000;
/**
 * The outage pauses one job takes before it fails as usual, an hour in all:
 * a file a provider fails on every time (one that always times out) holds up
 * its location no longer than that.
 */
const MAX_OUTAGE_PAUSES = 6;

export function nextSyncAfter(time: Date): Date {
  return new Date(time.getTime() + SYNC_INTERVAL_MS);
}

export function mayPauseForOutage(pausesMade: number): boolean {
  return pausesMade < MAX_OUTAGE_PAUSES;
}

/**
 * When to try again after `error`: the provider's own `Retry-After`, else
 * twice as long as the job's previous pause, starting at a minute. `null`
 * when the error is no provider outage or the job has paused often enough.
 */
export function outagePauseEnd(
  error: unknown,
  pausesMade: number,
  now: Date,
): Date | null {
  if (!mayPauseForOutage(pausesMade)) return null;
  const outage = findProviderOutage(error);
  if (!outage) return null;
  const delay =
    outage.context.retryAfterMs ?? FIRST_OUTAGE_PAUSE_MS * 2 ** pausesMade;
  return pauseEnd(now, Math.min(delay, MAX_OUTAGE_PAUSE_MS));
}

/** A throttled request waits as long as the provider asks. */
export function throttlePauseEnd(retryAt: Date, now: Date): Date {
  return pauseEnd(now, retryAt.getTime() - now.getTime());
}

function pauseEnd(now: Date, delayMs: number): Date {
  return new Date(now.getTime() + Math.max(delayMs, MIN_PAUSE_MS));
}
