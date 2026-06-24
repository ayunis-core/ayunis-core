import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { Message } from 'src/domain/messages/domain/message.entity';
import type { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import type { SourceAssignment } from './thread-source-assignment.entity';
import type { KnowledgeBaseAssignment } from './thread-knowledge-base-assignment.entity';
import type { KnowledgeBaseSummary } from 'src/domain/knowledge-bases/domain/knowledge-base-summary';

export class Thread {
  id: UUID;
  userId: UUID;
  model?: PermittedLanguageModel;
  sourceAssignments?: SourceAssignment[];
  mcpIntegrationIds: UUID[];
  knowledgeBaseAssignments?: KnowledgeBaseAssignment[];
  title?: string;
  messages: Message[];
  isAnonymous: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    userId: UUID;
    model?: PermittedLanguageModel;
    sourceAssignments?: SourceAssignment[];
    mcpIntegrationIds?: UUID[];
    knowledgeBaseAssignments?: KnowledgeBaseAssignment[];
    title?: string;
    messages: Message[];
    isAnonymous?: boolean;
    lastActivityAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.userId = params.userId;
    this.model = params.model;
    this.sourceAssignments = params.sourceAssignments;
    this.mcpIntegrationIds = params.mcpIntegrationIds ?? [];
    this.knowledgeBaseAssignments = params.knowledgeBaseAssignments;
    this.title = params.title;
    this.messages = params.messages;
    this.isAnonymous = params.isAnonymous ?? false;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
    // A freshly created thread's last activity is its creation time; it is
    // bumped whenever a message is added (see RecordThreadActivityUseCase).
    this.lastActivityAt = params.lastActivityAt ?? this.createdAt;
  }

  getLastMessage(): Message | undefined {
    return this.messages.at(-1);
  }

  /**
   * Returns deduplicated knowledge bases by knowledgeBaseId.
   * The same KB can appear multiple times in knowledgeBaseAssignments
   * when it was assigned by different origin skills.
   */
  getUniqueKnowledgeBases(): KnowledgeBaseSummary[] {
    const seen = new Set<UUID>();
    const result: KnowledgeBaseSummary[] = [];
    for (const assignment of this.knowledgeBaseAssignments ?? []) {
      if (!seen.has(assignment.knowledgeBase.id)) {
        seen.add(assignment.knowledgeBase.id);
        result.push(assignment.knowledgeBase);
      }
    }
    return result;
  }
}
