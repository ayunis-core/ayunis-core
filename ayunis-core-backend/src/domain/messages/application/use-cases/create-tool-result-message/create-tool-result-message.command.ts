import { ToolResultMessageContent } from 'src/domain/messages/domain/message-contents/tool-result.message-content.entity';
import { UUID } from 'crypto';

export class CreateToolResultMessageCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly content: Array<ToolResultMessageContent>,
  ) {}
}
