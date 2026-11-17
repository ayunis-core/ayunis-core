import type { SelectQueryBuilder } from 'typeorm';
import { MessageRecord } from 'src/domain/messages/infrastructure/persistence/local/schema/message.record';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import {
  SEARCHABLE_MESSAGE_ROLES,
  searchableTextBlockSql,
} from './searchable-message-text';

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
      WHERE ${searchableTextBlockSql('block')}
        AND block->>'text' ILIKE :search
    )`,
    )
    .getQuery();
  queryBuilder.andWhere(
    `(thread.title ILIKE :search OR EXISTS ${matchingMessages})`,
    {
      search: `%${search}%`,
      searchRoles: SEARCHABLE_MESSAGE_ROLES,
    },
  );
}
