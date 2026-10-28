import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import {
  WORKSPACE_DEFAULT_LIST_LIMIT,
  WORKSPACE_MAX_LIST_LIMIT,
} from 'src/domain/workspaces/domain/workspaces.constants';
import type {
  WorkspaceListOptions,
  WorkspaceSortKey,
} from 'src/domain/workspaces/application/ports/workspaces-repository.port';

export class FindAllWorkspacesQuery
  extends PaginatedQuery
  implements WorkspaceListOptions
{
  public readonly search?: string;
  public readonly sort: WorkspaceSortKey;

  constructor(params?: {
    search?: string;
    sort?: WorkspaceSortKey;
    limit?: number;
    offset?: number;
  }) {
    super({
      limit: Math.min(
        params?.limit ?? WORKSPACE_DEFAULT_LIST_LIMIT,
        WORKSPACE_MAX_LIST_LIMIT,
      ),
      offset: params?.offset ?? 0,
    });
    this.search = params?.search?.trim() || undefined;
    this.sort = params?.sort ?? 'updatedAt';
  }
}
