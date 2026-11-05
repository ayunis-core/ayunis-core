import { performance } from 'node:perf_hooks';

export interface SnapshotClock {
  now(): number;
  /** Returns a function that cancels the callback. */
  schedule(delayMs: number, fire: () => void): () => void;
}

const SYSTEM_CLOCK: SnapshotClock = {
  now: () => performance.now(),
  schedule: (delayMs, fire) => {
    const timer = setTimeout(fire, delayMs);
    return () => clearTimeout(timer);
  },
};

export const SNAPSHOT_INTERVAL_MS = 75;

export const SNAPSHOT_DUE = Symbol('snapshot-due');

/**
 * Limits streamed message snapshots to one per interval. Every delta rebuilds
 * and serializes the whole message, so sending one per token makes a long
 * answer cost quadratic work and bytes.
 */
export class SnapshotThrottle {
  private lastSentAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly clock: SnapshotClock = SYSTEM_CLOCK,
    private readonly intervalMs = SNAPSHOT_INTERVAL_MS,
  ) {}

  isDue(): boolean {
    return this.clock.now() - this.lastSentAt >= this.intervalMs;
  }

  markSent(): void {
    this.lastSentAt = this.clock.now();
  }

  /**
   * Passes `source` through and, while `isHolding()`, also yields
   * `SNAPSHOT_DUE` once the interval has elapsed without a new event, so a
   * provider pause does not leave the client on stale text.
   *
   * The source read stays in flight across that signal. Closing the source
   * therefore waits for the read to settle: the runtime has to finish its
   * teardown before the caller's own cleanup runs.
   */
  async *pace<T>(
    source: AsyncIterable<T>,
    isHolding: () => boolean,
  ): AsyncGenerator<T | typeof SNAPSHOT_DUE, void, void> {
    const iterator = source[Symbol.asyncIterator]();
    let read: Promise<IteratorResult<T>> | null = null;
    try {
      for (;;) {
        read ??= iterator.next();
        const result = isHolding() ? await this.untilDue(read) : await read;
        if (result === SNAPSHOT_DUE) {
          yield SNAPSHOT_DUE;
          continue;
        }
        read = null;
        if (result.done) return;
        yield result.value;
      }
    } finally {
      await read?.catch(() => undefined);
      // A no-op once the source has completed or failed.
      await iterator.return?.();
    }
  }

  private untilDue<T>(read: Promise<T>): Promise<T | typeof SNAPSHOT_DUE> {
    const delayMs = this.lastSentAt + this.intervalMs - this.clock.now();
    if (delayMs <= 0) return Promise.resolve(SNAPSHOT_DUE);
    let cancel = (): void => undefined;
    const due = new Promise<typeof SNAPSHOT_DUE>((resolve) => {
      cancel = this.clock.schedule(delayMs, () => resolve(SNAPSHOT_DUE));
    });
    return Promise.race([read, due]).finally(cancel);
  }
}
