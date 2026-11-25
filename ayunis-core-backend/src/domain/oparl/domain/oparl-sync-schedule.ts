import { OparlSyncKind, OparlSyncRunStatus } from './oparl-sync-run.entity';

const HOUR_MS = 60 * 60 * 1000;

export const DELTA_SYNC_INTERVAL_MS = 24 * HOUR_MS;
export const FULL_SYNC_INTERVAL_MS = 7 * 24 * HOUR_MS;
/** Covers clock skew between the RIS and us, and objects modified while the last sync listed. */
export const MODIFIED_SINCE_MARGIN_MS = HOUR_MS;
const FIRST_FAILURE_BACKOFF_MS = HOUR_MS;

export interface OparlSyncState {
  lastDeltaSyncAt: Date | null;
  lastFullSyncAt: Date | null;
}

/** A system never imported completely gets an initial import, then a full listing once a week, else a delta. */
export function nextSyncKind(state: OparlSyncState, now: Date): OparlSyncKind {
  if (!state.lastFullSyncAt) return OparlSyncKind.INITIAL;
  if (now.getTime() - state.lastFullSyncAt.getTime() >= FULL_SYNC_INTERVAL_MS)
    return OparlSyncKind.FULL;
  return OparlSyncKind.DELTA;
}

/** The `modified_since` of a delta: the start of the last successful sync, less a margin. */
export function modifiedSinceFor(state: OparlSyncState): Date | null {
  const last = Math.max(
    state.lastDeltaSyncAt?.getTime() ?? 0,
    state.lastFullSyncAt?.getTime() ?? 0,
  );
  if (last === 0) return null;
  return new Date(last - MODIFIED_SINCE_MARGIN_MS);
}

/**
 * When the system is due again after a run: a day after a finished run
 * started, sooner after failures (1, 2, 4 … hours, at most a day).
 */
export function nextSyncAfter(
  status: OparlSyncRunStatus,
  runStartedAt: Date,
  consecutiveFailures: number,
  now: Date,
): Date {
  if (status !== OparlSyncRunStatus.FAILED) {
    return new Date(
      Math.max(
        runStartedAt.getTime() + DELTA_SYNC_INTERVAL_MS,
        now.getTime() + HOUR_MS,
      ),
    );
  }
  const backoff = Math.min(
    FIRST_FAILURE_BACKOFF_MS * 2 ** Math.max(0, consecutiveFailures - 1),
    DELTA_SYNC_INTERVAL_MS,
  );
  return new Date(now.getTime() + backoff);
}
