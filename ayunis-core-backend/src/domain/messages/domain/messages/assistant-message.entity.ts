import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { Message } from 'src/domain/messages/domain/message.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import type { UUID } from 'crypto';
import type { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

export class AssistantMessage extends Message<
  TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
> {
  readonly answeringModelName?: string;

  constructor(params: {
    id?: UUID;
    threadId: UUID;
    createdAt?: Date;
    answeringModelName?: string;
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
    this.answeringModelName = params.answeringModelName;
  }
}
