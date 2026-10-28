import type { SelectQueryBuilder } from 'typeorm';
import { MessageRecord } from 'src/domain/messages/infrastructure/persistence/local/schema/message.record';
import { MessageRole } from 'src/domain/messages/domain/value-objects/message-role.object';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';

export function applyThreadSearch(
  queryBuilder: SelectQueryBuilder<ThreadRecord>,
  search: string,
): void {
  const matchingMessages = queryBuilder
    .subQuery()
    .select('1')
    .from(MessageRecord, 'searchMessage')
    .where('searchMessage.threadId = thread.id')
    .andWhere('searchMessage.role IN (:...searchRoles)')
    .andWhere(
      `EXISTS (
      SELECT 1 FROM jsonb_array_elements(searchMessage.content) AS block
      WHERE block->>'type' = 'text'
        AND block->>'text' ILIKE :search
        AND block->>'isSkillInstruction' IS DISTINCT FROM 'true'
    )`,
    )
    .getQuery();
  queryBuilder.andWhere(
    `(thread.title ILIKE :search OR EXISTS ${matchingMessages})`,
    {
      search: `%${search}%`,
      searchRoles: [MessageRole.USER, MessageRole.ASSISTANT],
    },
  );
}
