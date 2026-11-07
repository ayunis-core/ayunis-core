import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';

/**
 * Serializes mask allocation per thread. Allocating reads the thread's
 * existing masks and numbers new values after them, so two redactions on one
 * thread running at the same time would otherwise hand out the same
 * `{{pii:CATEGORY_n}}` token. Different threads never wait for each other.
 */
@Injectable()
export class ThreadMaskAllocationLock {
  private readonly tails = new Map<UUID, Promise<void>>();

  async runExclusive<T>(threadId: UUID, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(threadId) ?? Promise.resolve();
    let release!: () => void;
    const tail = new Promise<void>((resolve) => (release = resolve));
    this.tails.set(threadId, tail);
    await previous;
    try {
      return await task();
    } finally {
      if (this.tails.get(threadId) === tail) this.tails.delete(threadId);
      release();
    }
  }
}
