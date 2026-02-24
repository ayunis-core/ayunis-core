import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { SourceAssignment } from './thread-source-assignment.entity';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';

export type { KnowledgeBaseSummary };

export class Thread {
  id: UUID;
  userId: UUID;
  model?: PermittedLanguageModel;
  agentId?: UUID;
  sourceAssignments?: SourceAssignment[];
  mcpIntegrationIds: UUID[];
  knowledgeBases?: KnowledgeBaseSummary[];
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
    mcpIntegrationIds?: UUID[];
    knowledgeBases?: KnowledgeBaseSummary[];
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
    this.mcpIntegrationIds = params.mcpIntegrationIds ?? [];
    this.knowledgeBases = params.knowledgeBases;
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
