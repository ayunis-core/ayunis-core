import type { RunThreadEvent } from 'src/domain/runs/application/run-events';

/**
 * A first-run title generated alongside the run. The run stream emits it as
 * soon as it is ready but never waits for it: a title still generating when
 * the answer completes is saved in the background and reaches the client
 * with the next thread refresh.
 */
export interface PendingThreadTitle {
  takeReady(): RunThreadEvent | null;
  /** Aborts a title that is still generating, including its model call. */
  discard(): void;
}

/** `generate` must resolve to `null` instead of rejecting. */
export function startThreadTitle(
  generate: (signal: AbortSignal) => Promise<RunThreadEvent | null>,
): PendingThreadTitle {
  const abortController = new AbortController();
  let readyEvent: RunThreadEvent | null = null;
  void generate(abortController.signal).then((event) => {
    readyEvent = event;
  });
  return {
    takeReady: () => {
      const event = readyEvent;
      readyEvent = null;
      return event;
    },
    discard: () => abortController.abort(),
  };
}
