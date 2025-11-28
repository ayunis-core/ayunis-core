import { UUID, randomUUID } from 'crypto';
import { Message } from 'src/domain/messages/domain/message.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { SourceAssignment } from './thread-source-assignment.entity';

export class Thread {
  id: UUID;
  userId: UUID;
  model?: PermittedLanguageModel;
  agentId?: UUID;
  sourceAssignments?: SourceAssignment[];
  title?: string;
  messages: Message[];
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    model?: PermittedLanguageModel;
    agentId?: UUID;
    sourceAssignments?: SourceAssignment[];
    title?: string;
    messages: Message[];
    isAnonymous?: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.model = params.model;
    this.agentId = params.agentId;
    this.sourceAssignments = params.sourceAssignments;
    this.title = params.title;
    this.messages = params.messages;
    this.isAnonymous = params.isAnonymous ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  getLastMessage(): Message | undefined {
    return this.messages.at(-1);
  }
}
