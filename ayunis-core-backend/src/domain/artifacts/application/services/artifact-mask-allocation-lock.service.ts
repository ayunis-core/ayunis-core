import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';

/**
 * Serializes mask allocation per artifact. Allocating reads the artifact's
 * dictionary and numbers new values after it, so two writes to one artifact
 * running at the same time would otherwise hand out the same
 * `{{pii:CATEGORY_n}}` placeholder. Different artifacts never wait for each
 * other. Process-local, like `ThreadMaskAllocationLock`; across instances the
 * dictionary's unique constraints reject a duplicate.
 */
@Injectable()
export class ArtifactMaskAllocationLock {
  private readonly tails = new Map<UUID, Promise<void>>();

  async runExclusive<T>(artifactId: UUID, task: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(artifactId) ?? Promise.resolve();
    let release!: () => void;
    const tail = new Promise<void>((resolve) => (release = resolve));
    this.tails.set(artifactId, tail);
    await previous;
    try {
      return await task();
    } finally {
      if (this.tails.get(artifactId) === tail) this.tails.delete(artifactId);
      release();
    }
  }
}
