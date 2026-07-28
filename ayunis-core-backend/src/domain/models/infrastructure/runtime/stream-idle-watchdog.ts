/**
 * Milliseconds of silence between provider chunks before a stream counts as
 * stalled. Healthy providers emit deltas continuously — many per second — so
 * this only has to sit above the longest legitimate pause, not close to it.
 */
export const STREAM_IDLE_TIMEOUT_MS = 45_000;

/**
 * Detects a provider stream that stops producing chunks part-way through.
 *
 * The watchdog arms lazily, on the first chunk: time-to-first-byte is already
 * bounded by the provider SDK's own request timeout, and duplicating that
 * budget here would only make a slow prompt look like a stall. What is left
 * unguarded is the gap *between* chunks, where a dropped socket otherwise
 * goes unnoticed until the keep-alive agent times out minutes later.
 *
 * A stall raises InferenceStreamStalledError, a 504 rather than a 408: the
 * fault is upstream, and keeping it above the error filter's 500 threshold
 * leaves the rate of provider stalls visible instead of silently swallowed.
 */
export class StreamIdleWatchdog {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly idleMs: number,
    private readonly onStall: () => void,
  ) {}

  /** Records a chunk, restarting the idle countdown. */
  notifyChunk(): void {
    this.stop();
    this.timer = setTimeout(this.onStall, this.idleMs);
    // A pending watchdog must never be the reason the process stays alive.
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
