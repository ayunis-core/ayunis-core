import type { UUID } from 'crypto';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import { MessageRecord } from 'src/domain/messages/infrastructure/persistence/local/schema/message.record';
import type {
  FindPastChatParams,
  FindPastChatsParams,
} from 'src/domain/threads/application/ports/threads.repository';
import type {
  PastChatActivityRange,
  PastChatScope,
} from 'src/domain/threads/domain/past-chat-scope';
import { ThreadType } from 'src/domain/threads/domain/thread-type.enum';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { ThreadMapper } from 'src/domain/threads/infrastructure/persistence/local/mappers/thread.mapper';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { personalOrMemberWorkspaceSql } from './personal-or-member-workspace';

export async function findPastChats(
  threadRepository: Repository<ThreadRecord>,
  threadMapper: ThreadMapper,
  params: FindPastChatsParams,
): Promise<Paginated<Thread>> {
  const { userId, scope, activity, pagination } = params;
  const query = pastChatsQuery(threadRepository, userId, scope);
  applyPastChatActivity(query, activity);
  // Ties on the timestamp are broken by ID, so pages never overlap.
  const [records, total] = await query
    .addSelect(
      'COALESCE(thread.lastActivityAt, thread.createdAt)',
      'past_chat_activity',
    )
    .orderBy('past_chat_activity', 'DESC')
    .addOrderBy('thread.id', 'DESC')
    .limit(pagination.limit)
    .offset(pagination.offset)
    .getManyAndCount();
  return new Paginated<Thread>({
    data: records.map((record) => threadMapper.toDomain(record)),
    ...pagination,
    total,
  });
}

export async function findPastChat(
  threadRepository: Repository<ThreadRecord>,
  threadMapper: ThreadMapper,
  params: FindPastChatParams,
): Promise<Thread | null> {
  const { userId, scope, threadId } = params;
  const record = await pastChatsQuery(threadRepository, userId, scope)
    .andWhere('thread.id = :threadId', { threadId })
    .leftJoinAndSelect('thread.messages', 'message')
    .orderBy('message.createdAt', 'ASC')
    .addOrderBy('message.id', 'ASC')
    .getOne();
  return record ? threadMapper.toDomain(record) : null;
}

function pastChatsQuery(
  threadRepository: Repository<ThreadRecord>,
  userId: UUID,
  scope: PastChatScope,
): SelectQueryBuilder<ThreadRecord> {
  const query = threadRepository
    .createQueryBuilder('thread')
    .where('thread.userId = :userId', { userId })
    .andWhere(personalOrMemberWorkspaceSql('thread.workspaceId', ':userId'))
    .andWhere('thread.isAnonymous = false')
    .andWhere('thread.type = :chatType', { chatType: ThreadType.CHAT })
    .andWhere('thread.id <> :currentThreadId', {
      currentThreadId: scope.currentThreadId,
    });
  if (scope.workspaceId) {
    query.andWhere('thread.workspaceId = :scopeWorkspaceId', {
      scopeWorkspaceId: scope.workspaceId,
    });
  }
  return query;
}

function applyPastChatActivity(
  query: SelectQueryBuilder<ThreadRecord>,
  activity: PastChatActivityRange,
): void {
  const { from, before } = activity;
  if (!from && !before) return;
  const messages = query
    .subQuery()
    .select('1')
    .from(MessageRecord, 'activityMessage')
    .where('activityMessage.threadId = thread.id')
    .andWhere('activityMessage.role IN (:...activityRoles)');
  if (from) messages.andWhere('activityMessage.createdAt >= :activityFrom');
  if (before) {
    messages.andWhere('activityMessage.createdAt < :activityBefore');
  }
  query.andWhere(`EXISTS ${messages.getQuery()}`, {
    activityRoles: [MessageRole.USER, MessageRole.ASSISTANT],
    ...(from && { activityFrom: from }),
    ...(before && { activityBefore: before }),
  });
}
