import type { SelectQueryBuilder } from 'typeorm';
import type { ThreadsFindAllFilters } from 'src/domain/threads/application/ports/threads.repository';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { applyThreadSearch } from './apply-thread-search';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';

export function applyThreadListFilters(
  queryBuilder: SelectQueryBuilder<ThreadRecord>,
  filters?: ThreadsFindAllFilters,
): void {
  if (filters?.search) {
    applyThreadSearch(queryBuilder, filters.search);
  }

  if (filters?.workspaceId) {
    queryBuilder.andWhere('thread.workspaceId = :workspaceId', {
      workspaceId: filters.workspaceId,
    });
  }

  if (filters?.type) {
    queryBuilder.andWhere('thread.type = :type', { type: filters.type });
  }

  applyThreadClientFilter(queryBuilder, filters?.client);

  if (filters?.routineId) {
    queryBuilder.andWhere('thread.routineId = :routineId', {
      routineId: filters.routineId,
    });
  }
}

// Chats from a token client (the Outlook pane) stay out of the web app's lists
// unless that client's threads are asked for.
function applyThreadClientFilter(
  queryBuilder: SelectQueryBuilder<ThreadRecord>,
  client?: SessionClient,
): void {
  if (client) {
    queryBuilder.andWhere('thread.client = :client', { client });
  } else {
    queryBuilder.andWhere('thread.client IS NULL');
  }
}
