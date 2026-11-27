import type { UUID } from 'crypto';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type {
  ThreadContextRefs,
  ThreadsFindAllOptions,
} from 'src/domain/threads/application/ports/threads.repository';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';
import type { Repository } from 'typeorm';
import { In, IsNull } from 'typeorm';
import type { ThreadMapper } from 'src/domain/threads/infrastructure/persistence/local/mappers/thread.mapper';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import {
  personalOrMemberWorkspace,
  personalOrMemberWorkspaceSql,
} from './personal-or-member-workspace';

export const findThreadContextRefs = async (
  repository: Repository<ThreadRecord>,
  id: UUID,
  userId: UUID,
  client: SessionClient | null,
): Promise<ThreadContextRefs | null> => {
  const rows = await repository
    .createQueryBuilder('thread')
    .leftJoin('thread.knowledgeBaseAssignments', 'assignment')
    .select('thread.workspaceId', 'workspaceId')
    .addSelect('assignment.knowledgeBaseId', 'knowledgeBaseId')
    .where('thread.id = :id', { id })
    .andWhere('thread.userId = :userId', { userId })
    .andWhere('thread.client IS NOT DISTINCT FROM :client', { client })
    .andWhere(personalOrMemberWorkspaceSql('thread.workspaceId', ':userId'))
    .getRawMany<{
      workspaceId: UUID | null;
      knowledgeBaseId: UUID | null;
    }>();
  if (rows.length === 0) return null;
  return {
    workspaceId: rows[0].workspaceId,
    knowledgeBaseIds: rows.flatMap(({ knowledgeBaseId }) =>
      knowledgeBaseId ? [knowledgeBaseId] : [],
    ),
  };
};

export const findThreadsByIds = async (
  repository: Repository<ThreadRecord>,
  mapper: ThreadMapper,
  userId: UUID,
  ids: UUID[],
  client: SessionClient | null,
): Promise<Thread[]> => {
  if (ids.length === 0) return [];

  const records = await repository.find({
    where: {
      userId,
      id: In(ids),
      client: client ?? IsNull(),
      workspaceId: personalOrMemberWorkspace(userId),
    },
  });
  return records.map((record) => mapper.toDomain(record));
};

export const findThreadsByModel = async (
  repository: Repository<ThreadRecord>,
  mapper: ThreadMapper,
  modelId: UUID,
  options?: ThreadsFindAllOptions,
): Promise<Thread[]> => {
  const records = await repository.find({
    where: { modelId },
    relations: getRelations(options),
    order: options?.withMessages
      ? { messages: { createdAt: 'ASC' } }
      : undefined,
  });
  return records.map((record) => mapper.toDomain(record));
};

const getRelations = (options?: ThreadsFindAllOptions): string[] => {
  const relations: string[] = ['mcpIntegrations'];
  if (options?.withMessages) relations.push('messages');
  if (options?.withModel) relations.push('model');
  if (options?.withSources) {
    relations.push(
      'sourceAssignments',
      'sourceAssignments.source',
      'sourceAssignments.source.dataSourceDetails',
    );
  }
  if (options?.withKnowledgeBases) {
    relations.push(
      'knowledgeBaseAssignments',
      'knowledgeBaseAssignments.knowledgeBase',
    );
  }
  return relations;
};
