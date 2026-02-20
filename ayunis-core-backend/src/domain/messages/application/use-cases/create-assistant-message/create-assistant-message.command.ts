import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import type { UUID } from 'crypto';
import type { ThinkingMessageContent } from 'src/domain/messages/domain/message-contents/thinking-message-content.entity';

export class CreateAssistantMessageCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly content: Array<
      TextMessageContent | ToolUseMessageContent | ThinkingMessageContent
    >,
  ) {}
}
