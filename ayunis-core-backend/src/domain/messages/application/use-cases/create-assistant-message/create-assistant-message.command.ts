import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text.message-content.entity';
import { ToolUseMessageContent } from 'src/domain/messages/domain/message-contents/tool-use.message-content.entity';
import { UUID } from 'crypto';

export class CreateAssistantMessageCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly content: Array<TextMessageContent | ToolUseMessageContent>,
  ) {}
}
