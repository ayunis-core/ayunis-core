import type { UUID } from 'crypto';
import type { Thread } from 'src/domain/threads/domain/thread.entity';

export class RemoveSourceCommand {
  constructor(
    public readonly thread: Thread,
    public readonly sourceId: UUID,
  ) {}
}
