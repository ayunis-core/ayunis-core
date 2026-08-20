import type { SelectQueryBuilder } from 'typeorm';
import type { WorkspaceSortKey } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type { WorkspaceRecord } from './schema/workspace.record';

export function joinWorkspaceActivity(
  query: SelectQueryBuilder<WorkspaceRecord>,
): SelectQueryBuilder<WorkspaceRecord> {
  return query
    .leftJoin('threads', 'thread', 'thread."workspaceId" = workspace.id')
    .addGroupBy('workspace.id');
}

export function applyWorkspaceSearch(
  query: SelectQueryBuilder<WorkspaceRecord>,
  search?: string,
): void {
  if (!search) return;
  query.andWhere('workspace.name ILIKE :search', {
    search: `%${search}%`,
  });
}

export function applyWorkspaceSort(
  query: SelectQueryBuilder<WorkspaceRecord>,
  sort: WorkspaceSortKey,
): void {
  if (sort === 'name') {
    query.orderBy('LOWER(workspace.name)', 'ASC');
    return;
  }
  if (sort === 'createdAt') {
    query.orderBy('workspace.createdAt', 'DESC');
    return;
  }
  query
    .addSelect(
      `GREATEST(workspace."updatedAt", COALESCE(
        MAX(COALESCE(thread."lastActivityAt", thread."createdAt")),
        workspace."updatedAt"
      ))`,
      'effective_activity_at',
    )
    .orderBy('effective_activity_at', 'DESC');
}
