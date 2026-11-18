import type { UUID } from 'crypto';
import type { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';

export interface PastMessageMatch {
  threadId: UUID;
  threadTitle: string | null;
  /** Position in the whole chat, starting at 1, as `chat_read` counts it. */
  messageNumber: number;
  role: MessageRole.USER | MessageRole.ASSISTANT;
  createdAt: Date;
  /** The text around the first match, marked with "…" where it is cut. */
  excerpt: string;
}
