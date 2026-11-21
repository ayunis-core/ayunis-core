import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { MessageMapper } from 'src/domain/messages/infrastructure/persistence/local/mappers/message.mapper';
import { PermittedModelMapper } from 'src/domain/models/infrastructure/persistence/local-permitted-models/mappers/permitted-model.mapper';
import { ThreadSourceAssignmentMapper } from './thread-source-assignment.mapper';
import { ThreadKnowledgeBaseAssignmentMapper } from './thread-knowledge-base-assignment.mapper';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { McpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import { KnowledgeBaseAssignment } from 'src/domain/threads/domain/thread-knowledge-base-assignment.entity';
import {
  ThreadOriginKind,
  type ThreadOrigin,
} from 'src/domain/threads/domain/thread-origin';

@Injectable()
export class ThreadMapper {
  constructor(
    private readonly messageMapper: MessageMapper,
    private readonly permittedModelMapper: PermittedModelMapper,
    private readonly sourceAssignmentMapper: ThreadSourceAssignmentMapper,
    private readonly kbAssignmentMapper: ThreadKnowledgeBaseAssignmentMapper,
  ) {}

  toRecord(thread: Thread): ThreadRecord {
    const record = new ThreadRecord();
    record.id = thread.id;
    record.userId = thread.userId;
    record.modelId = thread.model?.id;
    record.model = thread.model
      ? this.permittedModelMapper.toRecord(thread.model)
      : undefined;
    record.title = thread.title;
    record.isAnonymous = thread.isAnonymous;
    record.mode = thread.mode;
    record.workspaceId = thread.workspaceId ?? null;
    this.writeOrigin(record, thread.origin);
    record.client = thread.client;
    record.messages = thread.messages.map((message) =>
      this.messageMapper.toRecord(message),
    );
    record.sourceAssignments = thread.sourceAssignments?.map((assignment) =>
      this.sourceAssignmentMapper.toRecord(assignment, thread.id),
    );
    record.mcpIntegrations = thread.mcpIntegrationIds.map(
      (id) => ({ id }) as McpIntegrationRecord,
    );
    if (thread.knowledgeBaseAssignments !== undefined) {
      record.knowledgeBaseAssignments = thread.knowledgeBaseAssignments.map(
        (assignment) => this.kbAssignmentMapper.toRecord(assignment, thread.id),
      );
    }
    record.lastActivityAt = thread.lastActivityAt;
    record.createdAt = thread.createdAt;
    record.updatedAt = thread.updatedAt;
    return record;
  }

  toDomain(threadEntity: ThreadRecord): Thread {
    return new Thread({
      id: threadEntity.id,
      userId: threadEntity.userId,
      model: this.mapModel(threadEntity),
      sourceAssignments: this.mapSourceAssignments(threadEntity),
      mcpIntegrationIds: this.mapMcpIntegrationIds(threadEntity),
      knowledgeBaseAssignments: this.mapKnowledgeBaseAssignments(threadEntity),
      title: threadEntity.title,
      isAnonymous: threadEntity.isAnonymous,
      mode: threadEntity.mode,
      workspaceId: threadEntity.workspaceId,
      origin: this.mapOrigin(threadEntity),
      client: threadEntity.client,
      messages: this.mapMessages(threadEntity),
      lastActivityAt: threadEntity.lastActivityAt ?? threadEntity.createdAt,
      createdAt: threadEntity.createdAt,
      updatedAt: threadEntity.updatedAt,
    });
  }

  private writeOrigin(record: ThreadRecord, origin: ThreadOrigin): void {
    record.origin = origin.kind;
    record.routineId =
      origin.kind === ThreadOriginKind.ROUTINE ? origin.routineId : null;
    record.sourceNotificationId =
      origin.kind === ThreadOriginKind.NOTIFICATION
        ? origin.notificationId
        : null;
    record.sourceReleaseNoteId =
      origin.kind === ThreadOriginKind.RELEASE_NOTE
        ? origin.releaseNoteId
        : null;
  }

  private mapOrigin(record: ThreadRecord): ThreadOrigin {
    switch (record.origin) {
      case ThreadOriginKind.CHAT:
        return { kind: ThreadOriginKind.CHAT };
      case ThreadOriginKind.ROUTINE:
        return { kind: ThreadOriginKind.ROUTINE, routineId: record.routineId };
      case ThreadOriginKind.NOTIFICATION:
        return {
          kind: ThreadOriginKind.NOTIFICATION,
          notificationId: record.sourceNotificationId,
        };
      case ThreadOriginKind.RELEASE_NOTE:
        return {
          kind: ThreadOriginKind.RELEASE_NOTE,
          releaseNoteId: record.sourceReleaseNoteId,
        };
    }
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

  private mapKnowledgeBaseAssignments(
    record: ThreadRecord,
  ): KnowledgeBaseAssignment[] | undefined {
    if (!record.knowledgeBaseAssignments) {
      return undefined;
    }
    return record.knowledgeBaseAssignments.map((a) =>
      this.kbAssignmentMapper.toDomain(a),
    );
  }

  private mapMessages(record: ThreadRecord) {
    return record.messages?.map((m) => this.messageMapper.toDomain(m)) ?? [];
  }
}
