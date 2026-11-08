/** Covers a queued job's pickup; past it, the idle poll catches late starts. */
const EXPECTED_RUN_WINDOW_MS = 30_000;

let expectedUntil = 0;

/**
 * Marks that a run will start on the server shortly, e.g. a routine started
 * with Run now, whose thread only exists once a worker picks up the job.
 */
export function expectThreadRunSoon(): void {
  expectedUntil = Date.now() + EXPECTED_RUN_WINDOW_MS;
}

export function isThreadRunExpected(): boolean {
  return Date.now() < expectedUntil;
}
