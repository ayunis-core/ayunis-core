import type { UUID } from 'crypto';
import type { Thread } from './thread.entity';

/**
 * Which of the user's chats a run may look back on. A workspace chat sees only
 * that workspace's chats, any other chat all of them; the run's own chat is
 * never part of its past.
 */
export class PastChatScope {
  constructor(
    public readonly currentThreadId: UUID,
    public readonly workspaceId: UUID | null,
  ) {}

  static of(thread: Thread): PastChatScope {
    return new PastChatScope(thread.id, thread.workspaceId);
  }
}

/** Keeps chats with a user or assistant message in `[from, before)`. */
export interface PastChatActivityRange {
  from?: Date;
  before?: Date;
}
