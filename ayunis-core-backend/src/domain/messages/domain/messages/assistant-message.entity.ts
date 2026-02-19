import type { TextMessageContent } from '../message-contents/text-message-content.entity';
import type { ToolUseMessageContent } from '../message-contents/tool-use.message-content.entity';
import { Message } from '../message.entity';
import { MessageRole } from '../value-objects/message-role.object';
import type { UUID } from 'crypto';
import type { ThinkingMessageContent } from '../message-contents/thinking-message-content.entity';

export class AssistantMessage extends Message<
  TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
> {
  constructor(params: {
    id?: UUID;
    threadId: UUID;
    createdAt?: Date;
    content: Array<
      TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
    >;
  }) {
    super({
      id: params.id,
      threadId: params.threadId,
      role: MessageRole.ASSISTANT,
      createdAt: params.createdAt,
      content: params.content,
    });
  }
}
