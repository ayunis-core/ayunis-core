import { UUID } from 'crypto';
import { Message } from 'src/domain/messages/domain/message.entity';

export const MESSAGES_REPOSITORY = 'MESSAGES_REPOSITORY';

export abstract class MessagesRepository {
  abstract create(message: Message): Promise<Message>;
  abstract findById(id: UUID): Promise<Message | null>;
  abstract findManyByThreadId(threadId: UUID): Promise<Message[]>;
  abstract delete(id: UUID): Promise<void>;
}
