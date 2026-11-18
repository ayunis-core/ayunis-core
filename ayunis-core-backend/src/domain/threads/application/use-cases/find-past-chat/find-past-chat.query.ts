import type { UUID } from 'crypto';
import type { PastChatScope } from 'src/domain/threads/domain/past-chat-scope';

export class FindPastChatQuery {
  constructor(
    public readonly scope: PastChatScope,
    public readonly threadId: UUID,
  ) {}
}
