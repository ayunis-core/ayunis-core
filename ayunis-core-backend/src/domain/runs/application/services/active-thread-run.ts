import type { UUID } from 'crypto';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import { RunEventReplay } from './run-event-replay';

export interface ActiveThreadRunOwner {
  threadId: UUID;
  userId: UUID;
}

class RunEventListener {
  private readonly queue: RunEvent[];
  private wake?: () => void;
  private ended = false;

  constructor(backlog: RunEvent[]) {
    this.queue = backlog;
  }

  push(event: RunEvent): void {
    this.queue.push(event);
    this.wake?.();
  }

  end(): void {
    this.ended = true;
    this.wake?.();
  }

  async *events(): AsyncGenerator<RunEvent> {
    for (;;) {
      const event = this.queue.shift();
      if (event) {
        yield event;
        continue;
      }
      if (this.ended) return;
      await new Promise<void>((resolve) => (this.wake = resolve));
      this.wake = undefined;
    }
  }
}

/**
 * A run in progress on a thread, independent of who is listening. Listeners
 * can join at any time: each first receives the run's replay, then its live
 * events. A run that can be cancelled is aborted once nobody has listened
 * for `unwatchedTimeoutMs`.
 */
export class ActiveThreadRun {
  private readonly replay = new RunEventReplay();
  private readonly listeners = new Set<RunEventListener>();
  private unwatchedTimer?: NodeJS.Timeout;
  private closed = false;

  constructor(
    readonly owner: ActiveThreadRunOwner,
    private readonly abortController: AbortController | undefined,
    private readonly unwatchedTimeoutMs: number,
    private readonly onClosed: () => void,
  ) {
    this.armUnwatchedTimer();
  }

  get cancellable(): boolean {
    return this.abortController !== undefined;
  }

  publish(event: RunEvent): void {
    if (this.closed) return;
    this.replay.record(event);
    this.listeners.forEach((listener) => listener.push(event));
  }

  cancel(): void {
    this.abortController?.abort();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.unwatchedTimer);
    this.listeners.forEach((listener) => listener.end());
    this.onClosed();
  }

  /** Ends when the run closes or `signal` aborts; leaving never stops the run. */
  async *subscribe(signal?: AbortSignal): AsyncGenerator<RunEvent> {
    if (signal?.aborted) return;
    const listener = new RunEventListener(this.replay.events());
    if (this.closed) listener.end();
    const onAbort = () => listener.end();
    signal?.addEventListener('abort', onAbort, { once: true });
    this.listeners.add(listener);
    clearTimeout(this.unwatchedTimer);
    try {
      yield* listener.events();
    } finally {
      signal?.removeEventListener('abort', onAbort);
      this.listeners.delete(listener);
      this.armUnwatchedTimer();
    }
  }

  private armUnwatchedTimer(): void {
    if (!this.abortController || this.closed || this.listeners.size > 0) {
      return;
    }
    clearTimeout(this.unwatchedTimer);
    this.unwatchedTimer = setTimeout(
      () => this.cancel(),
      this.unwatchedTimeoutMs,
    );
    this.unwatchedTimer.unref();
  }
}
