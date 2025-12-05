import { Message } from '../message.entity';
import { MessageRole } from '../value-objects/message-role.object';
import { TextMessageContent } from '../message-contents/text-message-content.entity';
import { ImageMessageContent } from '../message-contents/image-message-content.entity';
import { UUID } from 'crypto';

export class UserMessage extends Message<
  TextMessageContent | ImageMessageContent
> {
  constructor(params: {
    id?: UUID;
    threadId: UUID;
    createdAt?: Date;
    content: Array<TextMessageContent | ImageMessageContent>;
  }) {
    super({
      id: params.id,
      threadId: params.threadId,
      role: MessageRole.USER,
      createdAt: params.createdAt,
      content: params.content,
    });
  }
}
