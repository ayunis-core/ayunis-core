import { UUID, randomUUID } from 'crypto';
import { Message } from 'src/domain/messages/domain/message.entity';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { Agent } from 'src/domain/agents/domain/agent.entity';
import { SourceAssignment } from './thread-source-assignment.entity';

export class Thread {
  id: UUID;
  userId: UUID;
  model?: PermittedLanguageModel;
  agent?: Agent;
  sourceAssignments?: SourceAssignment[];
  title?: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    model?: PermittedLanguageModel;
    agent?: Agent;
    sourceAssignments?: SourceAssignment[];
    title?: string;
    messages: Message[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.model = params.model;
    this.agent = params.agent;
    this.sourceAssignments = params.sourceAssignments;
    this.title = params.title;
    this.messages = params.messages;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  getLastMessage(): Message | undefined {
    return this.messages.at(-1);
  }
}
