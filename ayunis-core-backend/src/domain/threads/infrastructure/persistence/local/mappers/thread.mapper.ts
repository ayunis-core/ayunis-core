import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import {
  Thread,
  KnowledgeBaseSummary,
} from 'src/domain/threads/domain/thread.entity';
import { ThreadRecord } from '../schema/thread.record';
import { MessageMapper } from 'src/domain/messages/infrastructure/persistence/local/mappers/message.mapper';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import { ThreadSourceAssignmentMapper } from './thread-source-assignment.mapper';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { McpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import { ThreadKnowledgeBaseAssignmentRecord } from '../schema/thread-knowledge-base-assignment.record';

@Injectable()
export class ThreadMapper {
  constructor(
    private readonly messageMapper: MessageMapper,
    private readonly permittedModelMapper: PermittedModelMapper,
    private readonly sourceAssignmentMapper: ThreadSourceAssignmentMapper,
  ) {}

  toRecord(thread: Thread): ThreadRecord {
    const record = new ThreadRecord();
    record.id = thread.id;
    record.userId = thread.userId;
    record.modelId = thread.model?.id;
    record.model = thread.model
      ? this.permittedModelMapper.toRecord(thread.model)
      : undefined;
    record.agentId = thread.agentId;
    record.title = thread.title;
    record.isAnonymous = thread.isAnonymous;
    record.messages = thread.messages.map((message) =>
      this.messageMapper.toRecord(message),
    );
    record.sourceAssignments = thread.sourceAssignments?.map((assignment) =>
      this.sourceAssignmentMapper.toRecord(assignment, thread.id),
    );
    record.mcpIntegrations = thread.mcpIntegrationIds.map(
      (id) => ({ id }) as McpIntegrationRecord,
    );
    if (thread.knowledgeBases !== undefined) {
      record.knowledgeBaseAssignments = thread.knowledgeBases.map(
        (kb) =>
          ({
            knowledgeBaseId: kb.id,
            knowledgeBase: { id: kb.id, name: kb.name },
          }) as ThreadKnowledgeBaseAssignmentRecord,
      );
    }
    record.createdAt = thread.createdAt;
    record.updatedAt = thread.updatedAt;
    return record;
  }

  toDomain(threadEntity: ThreadRecord): Thread {
    return new Thread({
      id: threadEntity.id,
      userId: threadEntity.userId,
      model: this.mapModel(threadEntity),
      agentId: threadEntity.agentId,
      sourceAssignments: this.mapSourceAssignments(threadEntity),
      mcpIntegrationIds: this.mapMcpIntegrationIds(threadEntity),
      knowledgeBases: this.mapKnowledgeBases(threadEntity),
      title: threadEntity.title,
      isAnonymous: threadEntity.isAnonymous,
      messages: this.mapMessages(threadEntity),
      createdAt: threadEntity.createdAt,
      updatedAt: threadEntity.updatedAt,
    });
  }

  private mapModel(record: ThreadRecord): PermittedLanguageModel | undefined {
    return record.modelId && record.model
      ? (this.permittedModelMapper.toDomain(
          record.model,
        ) as PermittedLanguageModel)
      : undefined;
  }

  private mapSourceAssignments(record: ThreadRecord) {
    return (
      record.sourceAssignments?.map((a) =>
        this.sourceAssignmentMapper.toDomain(a),
      ) ?? []
    );
  }

  private mapMcpIntegrationIds(record: ThreadRecord): UUID[] {
    return record.mcpIntegrations?.map((i) => i.id) ?? [];
  }

  private mapKnowledgeBases(
    record: ThreadRecord,
  ): KnowledgeBaseSummary[] | undefined {
    if (!record.knowledgeBaseAssignments) {
      return undefined;
    }
    return record.knowledgeBaseAssignments.map((assignment) => ({
      id: assignment.knowledgeBase.id,
      name: assignment.knowledgeBase.name,
    }));
  }

  private mapMessages(record: ThreadRecord) {
    return record.messages?.map((m) => this.messageMapper.toDomain(m)) ?? [];
  }
}
