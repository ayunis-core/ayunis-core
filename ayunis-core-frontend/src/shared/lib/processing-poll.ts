import { useState } from 'react';

export const PROCESSING_POLL_FAST_MS = 1000;
export const PROCESSING_POLL_SLOW_MS = 5000;
/** Most processing jobs finish within seconds; after this window the poll relaxes. */
export const PROCESSING_POLL_FAST_WINDOW_MS = 20_000;

export type ProcessingPollInterval = (hasProcessing: boolean) => number | false;

/**
 * Refetch interval for a list that contains processing items. Polls fast
 * while processing is young, so a finished job shows up within a second,
 * then slows down so long OCR jobs do not keep a full query in flight every
 * second. One instance tracks one query; the window restarts when processing
 * stops and later resumes.
 */
export function createProcessingPollInterval(
  now: () => number = Date.now,
): ProcessingPollInterval {
  let processingSince: number | null = null;
  const intervalFor = (since: number): number =>
    now() - since < PROCESSING_POLL_FAST_WINDOW_MS
      ? PROCESSING_POLL_FAST_MS
      : PROCESSING_POLL_SLOW_MS;
  return (hasProcessing) => {
    processingSince = hasProcessing ? (processingSince ?? now()) : null;
    return processingSince === null ? false : intervalFor(processingSince);
  };
}

/** A per-component instance of {@link createProcessingPollInterval}. */
export function useProcessingPollInterval(): ProcessingPollInterval {
  const [pollInterval] = useState(() => createProcessingPollInterval());
  return pollInterval;
}
