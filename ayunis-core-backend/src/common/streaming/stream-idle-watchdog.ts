/** Silence between chunks before a provider stream counts as stalled. */
export const STREAM_IDLE_TIMEOUT_MS = 45_000;

/**
 * Detects a provider stream that stops producing chunks part-way through.
 * It arms on the first chunk, leaving time-to-first-byte to provider SDKs.
 */
export class StreamIdleWatchdog {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly idleMs: number,
    private readonly onStall: () => void,
  ) {}

  notifyChunk(): void {
    this.stop();
    this.timer = setTimeout(this.onStall, this.idleMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
