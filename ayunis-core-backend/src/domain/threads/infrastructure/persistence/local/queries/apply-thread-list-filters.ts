import type { SelectQueryBuilder } from 'typeorm';
import type { ThreadsFindAllFilters } from 'src/domain/threads/application/ports/threads.repository';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { applyThreadSearch } from './apply-thread-search';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';
import { ThreadOriginKind } from 'src/domain/threads/domain/thread-origin';

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

  applyRoutineThreadFilter(queryBuilder, filters?.isRoutine);
  applyThreadClientFilter(queryBuilder, filters?.client);

  if (filters?.routineId) {
    queryBuilder.andWhere('thread.routineId = :routineId', {
      routineId: filters.routineId,
    });
  }
}

function applyRoutineThreadFilter(
  queryBuilder: SelectQueryBuilder<ThreadRecord>,
  isRoutine?: boolean,
): void {
  if (isRoutine === undefined) return;
  queryBuilder.andWhere(
    isRoutine
      ? 'thread.origin = :routineOrigin'
      : 'thread.origin <> :routineOrigin',
    { routineOrigin: ThreadOriginKind.ROUTINE },
  );
}

// Chats from token clients stay out of web lists, and each token surface sees
// only its own chats.
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
