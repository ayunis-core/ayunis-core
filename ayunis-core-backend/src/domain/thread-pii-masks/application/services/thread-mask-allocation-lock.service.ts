import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';

/**
 * Serializes mask allocation per thread. Allocating reads the thread's
 * existing masks and numbers new values after them, so two redactions on one
 * thread running at the same time would otherwise hand out the same
 * `{{pii:CATEGORY_n}}` token. Different threads never wait for each other.
 *
 * The lock lives in this process, which is correct while the backend runs as
 * a single instance (the same assumption ThreadRunLock makes); AYC-1258
 * tracks shared coordination before scaling past one replica.
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
