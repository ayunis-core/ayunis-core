import type { UUID } from 'crypto';
import type { Thread } from '../../../domain/thread.entity';

export class RemoveSourceCommand {
  constructor(
    public readonly thread: Thread,
    public readonly sourceId: UUID,
  ) {}
}
