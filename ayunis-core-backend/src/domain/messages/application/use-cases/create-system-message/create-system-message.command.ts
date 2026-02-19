import type { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import type { UUID } from 'crypto';

export class CreateSystemMessageCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly content: Array<TextMessageContent>,
  ) {}
}
