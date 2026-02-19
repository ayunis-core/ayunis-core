import { Injectable } from '@nestjs/common';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadRecord } from '../schema/thread.record';
import { MessageMapper } from 'src/domain/messages/infrastructure/persistence/local/mappers/message.mapper';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import { ThreadSourceAssignmentMapper } from './thread-source-assignment.mapper';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { McpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';

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
    record.createdAt = thread.createdAt;
    record.updatedAt = thread.updatedAt;
    return record;
  }

  toDomain(threadEntity: ThreadRecord): Thread {
    return new Thread({
      id: threadEntity.id,
      userId: threadEntity.userId,
      model:
        threadEntity.modelId && threadEntity.model
          ? (this.permittedModelMapper.toDomain(
              threadEntity.model,
            ) as PermittedLanguageModel)
          : undefined,
      agentId: threadEntity.agentId,
      sourceAssignments:
        threadEntity.sourceAssignments?.map((assignment) =>
          this.sourceAssignmentMapper.toDomain(assignment),
        ) || [],
      mcpIntegrationIds:
        threadEntity.mcpIntegrations?.map((integration) => integration.id) ??
        [],
      title: threadEntity.title,
      isAnonymous: threadEntity.isAnonymous,
      messages:
        threadEntity.messages.map((message) =>
          this.messageMapper.toDomain(message),
        ) || [],
      createdAt: threadEntity.createdAt,
      updatedAt: threadEntity.updatedAt,
    });
  }
}
