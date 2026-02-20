import type { Message } from 'src/domain/messages/domain/message.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
export class AddMessageCommand {
  constructor(
    public readonly thread: Thread,
    public readonly message: Message,
  ) {}
}
