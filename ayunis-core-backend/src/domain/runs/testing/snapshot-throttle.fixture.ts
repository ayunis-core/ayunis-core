import type { SnapshotClock } from 'src/domain/runs/application/agent-runtime/snapshot-throttle';

interface ScheduledTimer {
  at: number;
  fire: () => void;
}

/** A clock that only moves when the test advances it. */
export class ManualClock implements SnapshotClock {
  private current = 0;
  private readonly timers = new Set<ScheduledTimer>();

  now(): number {
    return this.current;
  }

  schedule(delayMs: number, fire: () => void): () => void {
    const timer = { at: this.current + delayMs, fire };
    this.timers.add(timer);
    return () => this.timers.delete(timer);
  }

  advance(ms: number): void {
    this.current += ms;
    for (const timer of [...this.timers]) {
      if (timer.at > this.current) continue;
      this.timers.delete(timer);
      timer.fire();
    }
  }
}

type Delivery<T> =
  | { kind: 'value'; value: T }
  | { kind: 'end' }
  | { kind: 'error'; error: Error };

/**
 * An async source the test feeds by hand. It is an async generator, so an
 * early `return()` queues behind an in-flight read exactly like the runtime.
 */
export class EventChannel<T> implements AsyncIterable<T> {
  closed = false;
  readCount = 0;
  private readonly queue: Array<Delivery<T>> = [];
  private waiting: ((delivery: Delivery<T>) => void) | null = null;

  push(value: T): void {
    this.deliver({ kind: 'value', value });
  }

  end(): void {
    this.deliver({ kind: 'end' });
  }

  fail(error: Error): void {
    this.deliver({ kind: 'error', error });
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<T> {
    try {
      for (;;) {
        const delivery = await this.read();
        if (delivery.kind === 'end') return;
        if (delivery.kind === 'error') throw delivery.error;
        this.readCount++;
        yield delivery.value;
      }
    } finally {
      this.closed = true;
    }
  }

  private deliver(delivery: Delivery<T>): void {
    const waiting = this.waiting;
    this.waiting = null;
    if (waiting) waiting(delivery);
    else this.queue.push(delivery);
  }

  private read(): Promise<Delivery<T>> {
    const queued = this.queue.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise((resolve) => (this.waiting = resolve));
  }
}

/** Lets every already-resolved promise chain run to its next real wait. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
