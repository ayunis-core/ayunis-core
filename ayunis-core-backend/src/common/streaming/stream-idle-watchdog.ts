/**
 * Silence between chunks before a provider stream counts as stalled.
 *
 * Generous on purpose: reasoning models legitimately go silent for minutes —
 * OpenAI-style models stream nothing while reasoning, and the Anthropic SDK
 * swallows the API's keep-alive pings before they reach us — so a tighter
 * budget executes healthy runs mid-thought (45s killed every heavy
 * Opus/Sonnet task, AYC-665). The cost of the slack is only how long a
 * genuinely dead stream takes to surface.
 */
export const STREAM_IDLE_TIMEOUT_MS = 180_000;

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
