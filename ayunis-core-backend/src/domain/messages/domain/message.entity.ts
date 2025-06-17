import { MessageRole } from './value-objects/message-role.object';
import { MessageContent } from './message-content.entity';
import { UUID } from 'crypto';
import { randomUUID } from 'node:crypto';

export abstract class Message<T extends MessageContent = MessageContent> {
  id: UUID;
  threadId: UUID;
  role: MessageRole;
  content: T[];
  createdAt: Date;

  constructor(params: {
    threadId: UUID;
    role: MessageRole;
    content: T[];
    createdAt?: Date;
  }) {
    this.id = randomUUID();
    this.threadId = params.threadId;
    this.role = params.role;
    this.content = params.content;
    this.createdAt = params.createdAt ?? new Date();
  }
}
