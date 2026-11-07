import type { UUID } from 'crypto';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';
import type { ThreadType } from 'src/domain/threads/domain/thread-type.enum';

export class FindAllThreadsQuery extends PaginatedQuery {
  constructor(
    public readonly userId: UUID,
    public readonly options?: {
      withSources?: boolean;
      withMessages?: boolean;
      withModel?: boolean;
      withKnowledgeBases?: boolean;
    },
    public readonly filters?: {
      search?: string;
      workspaceId?: UUID;
      type?: ThreadType;
      routineId?: UUID;
    },
    pagination?: { limit?: number; offset?: number },
  ) {
    super({
      limit: pagination?.limit ?? ThreadsConstants.DEFAULT_LIMIT,
      offset: pagination?.offset ?? 0,
    });
  }
}
