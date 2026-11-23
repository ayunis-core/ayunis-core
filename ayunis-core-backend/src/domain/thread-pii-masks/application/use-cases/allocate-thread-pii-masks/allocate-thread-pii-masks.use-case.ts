import { Injectable, Logger } from '@nestjs/common';
import { createMaskRegistry } from 'src/common/anonymization/domain/apply-mask-replacements';
import { ThreadPiiMaskRepository } from 'src/domain/thread-pii-masks/application/ports/thread-pii-mask.repository';
import { ThreadMaskAllocationLock } from 'src/domain/thread-pii-masks/application/services/thread-mask-allocation-lock.service';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import type { AllocateThreadPiiMasksCommand } from './allocate-thread-pii-masks.command';

export interface AllocatedThreadPiiMasks {
  /** The thread's full mask dictionary including masks created by this call. */
  masks: ThreadPiiMask[];
  created: ThreadPiiMask[];
}

/**
 * Makes sure the thread's mask dictionary has a token for each of the given
 * values, matched exactly by category and value, without running detection.
 * Values the thread has no token for get the next free index of their
 * category; new masks are persisted before the result is returned. Runs under
 * the same per-thread lock as anonymization, so both number after the same
 * existing masks. A thread deleted meanwhile surfaces as
 * `ThreadPiiMaskThreadMissingError`.
 */
@Injectable()
export class AllocateThreadPiiMasksUseCase {
  private readonly logger = new Logger(AllocateThreadPiiMasksUseCase.name);

  constructor(
    private readonly repository: ThreadPiiMaskRepository,
    private readonly allocationLock: ThreadMaskAllocationLock,
  ) {}

  execute(
    command: AllocateThreadPiiMasksCommand,
  ): Promise<AllocatedThreadPiiMasks> {
    return this.allocationLock.runExclusive(command.threadId, () =>
      this.allocate(command),
    );
  }

  private async allocate(
    command: AllocateThreadPiiMasksCommand,
  ): Promise<AllocatedThreadPiiMasks> {
    this.logger.debug(
      { threadId: command.threadId, valueCount: command.values.length },
      'Allocating thread PII masks',
    );
    const existing = await this.repository.findByThreadId(command.threadId);
    const registry = createMaskRegistry(
      existing.map((mask) => mask.toPiiMask()),
    );
    for (const { category, value } of command.values) {
      registry.resolve(category, value);
    }
    const created = registry.newMasks.map((mask) =>
      ThreadPiiMask.fromPiiMask(command.threadId, mask),
    );
    if (created.length > 0) {
      await this.repository.saveMany(created);
    }
    return { masks: [...existing, ...created], created };
  }
}
