import { Message } from '../message.entity';
import { MessageRole } from '../value-objects/message-role.object';
import type { TextMessageContent } from '../message-contents/text-message-content.entity';
import type { UUID } from 'crypto';

export class SystemMessage extends Message<TextMessageContent> {
  constructor(params: {
    id?: UUID;
    threadId: UUID;
    createdAt?: Date;
    content: Array<TextMessageContent>;
  }) {
    super({
      id: params.id,
      threadId: params.threadId,
      role: MessageRole.SYSTEM,
      createdAt: params.createdAt,
      content: params.content,
    });
  }
}
