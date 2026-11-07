import type { SelectQueryBuilder } from 'typeorm';
import type { ThreadsFindAllFilters } from 'src/domain/threads/application/ports/threads.repository';
import type { ThreadRecord } from 'src/domain/threads/infrastructure/persistence/local/schema/thread.record';
import { applyThreadSearch } from './apply-thread-search';

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

  if (filters?.routineId) {
    queryBuilder.andWhere('thread.routineId = :routineId', {
      routineId: filters.routineId,
    });
  }
}
