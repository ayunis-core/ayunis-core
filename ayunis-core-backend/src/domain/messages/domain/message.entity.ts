import type { MessageRole } from './value-objects/message-role.object';
import type { MessageContent } from './message-content.entity';
import type { UUID } from 'crypto';
import { randomUUID } from 'node:crypto';

export abstract class Message<T extends MessageContent = MessageContent> {
  id: UUID;
  threadId: UUID;
  role: MessageRole;
  content: T[];
  createdAt: Date;

  constructor(params: {
    id?: UUID;
    threadId: UUID;
    role: MessageRole;
    content: T[];
    createdAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.threadId = params.threadId;
    this.role = params.role;
    this.content = params.content;
    this.createdAt = params.createdAt ?? new Date();
  }
}
