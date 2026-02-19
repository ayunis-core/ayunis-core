import type { ToolResultMessageContent } from '../message-contents/tool-result.message-content.entity';
import { Message } from '../message.entity';
import { MessageRole } from '../value-objects/message-role.object';
import type { UUID } from 'crypto';

export class ToolResultMessage extends Message<ToolResultMessageContent> {
  constructor(params: {
    id?: UUID;
    threadId: UUID;
    createdAt?: Date;
    content: ToolResultMessageContent[];
  }) {
    super({
      id: params.id,
      threadId: params.threadId,
      role: MessageRole.TOOL,
      createdAt: params.createdAt,
      content: params.content,
    });
  }
}
