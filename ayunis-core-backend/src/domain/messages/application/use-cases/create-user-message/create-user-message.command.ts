import { TextMessageContent } from 'src/domain/messages/domain/message-contents/text-message-content.entity';
import { UUID } from 'crypto';

export class CreateUserMessageCommand {
  constructor(
    public readonly threadId: UUID,
    public readonly content: Array<TextMessageContent>,
  ) {}
}
