import type { UUID } from 'crypto';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';
import type { SessionClient } from 'src/iam/sessions/domain/value-objects/session-client';

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
      /** Only routine threads when true, every other thread when false. */
      isRoutine?: boolean;
      routineId?: UUID;
      /** Threads of this client; without it, the session's client (the web app for a browser session). */
      client?: SessionClient;
    },
    pagination?: { limit?: number; offset?: number },
  ) {
    super({
      limit: pagination?.limit ?? ThreadsConstants.DEFAULT_LIMIT,
      offset: pagination?.offset ?? 0,
    });
  }
}
