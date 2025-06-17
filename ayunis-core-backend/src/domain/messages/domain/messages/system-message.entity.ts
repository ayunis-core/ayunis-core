import { Message } from '../message.entity';
import { MessageRole } from '../value-objects/message-role.object';
import { TextMessageContent } from '../message-contents/text.message-content.entity';
import { UUID } from 'crypto';

export class SystemMessage extends Message<TextMessageContent> {
  constructor(params: {
    threadId: UUID;
    createdAt?: Date;
    content: Array<TextMessageContent>;
  }) {
    super({
      threadId: params.threadId,
      role: MessageRole.SYSTEM,
      createdAt: params.createdAt,
      content: params.content,
    });
  }
}
