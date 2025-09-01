import { TextMessageContent } from '../message-contents/text-message-content.entity';
import { ToolUseMessageContent } from '../message-contents/tool-use.message-content.entity';
import { Message } from '../message.entity';
import { MessageRole } from '../value-objects/message-role.object';
import { UUID } from 'crypto';
import { ThinkingMessageContent } from '../message-contents/thinking-message-content.entity';

export class AssistantMessage extends Message<
  TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
> {
  constructor(params: {
    threadId: UUID;
    createdAt?: Date;
    content: Array<
      TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
    >;
  }) {
    super({
      threadId: params.threadId,
      role: MessageRole.ASSISTANT,
      createdAt: params.createdAt,
      content: params.content,
    });
  }
}
