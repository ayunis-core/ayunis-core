/** Silence between chunks before a provider stream counts as stalled. */
export const STREAM_IDLE_TIMEOUT_MS = 45_000;

/**
 * Budget for the first chunk. Time-to-first-byte covers provider-side
 * queueing and prompt processing, which is legitimately slower than the
 * gaps between chunks once streaming has started.
 */
export const STREAM_FIRST_CHUNK_TIMEOUT_MS = 90_000;

/**
 * Detects a provider stream that stops producing chunks. Callers arm it when
 * the request starts (typically with the first-chunk budget) and re-arm it
 * per chunk via notifyChunk().
 */
export class StreamIdleWatchdog {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly idleMs: number,
    private readonly onStall: (elapsedMs: number) => void,
  ) {}

  /**
   * (Re)starts the stall clock, optionally with a one-off budget. The budget
   * that actually elapsed is handed to onStall so a first-chunk stall is
   * reported with its own (longer) wait, not the inter-chunk one.
   */
  arm(budgetMs: number = this.idleMs): void {
    this.stop();
    this.timer = setTimeout(() => this.onStall(budgetMs), budgetMs);
    this.timer.unref();
  }

  notifyChunk(): void {
    this.arm();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
