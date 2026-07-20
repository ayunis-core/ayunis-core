import type { UUID } from 'crypto';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';

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
    },
    pagination?: { limit?: number; offset?: number },
  ) {
    super({
      limit: pagination?.limit ?? ThreadsConstants.DEFAULT_LIMIT,
      offset: pagination?.offset ?? 0,
    });
  }
}
