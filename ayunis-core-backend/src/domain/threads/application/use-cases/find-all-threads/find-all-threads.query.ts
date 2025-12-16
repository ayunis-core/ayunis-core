import { UUID } from 'crypto';

export class FindAllThreadsQuery {
  public readonly userId: UUID;
  public readonly options?: {
    withSources?: boolean;
    withMessages?: boolean;
    withAgent?: boolean;
    withModel?: boolean;
  };
  public readonly filters?: {
    search?: string;
    agentId?: string;
  };
  public readonly limit: number;
  public readonly offset: number;

  constructor(params: {
    userId: UUID;
    options?: {
      withSources?: boolean;
      withMessages?: boolean;
      withAgent?: boolean;
      withModel?: boolean;
    };
    filters?: {
      search?: string;
      agentId?: string;
    };
    limit?: number;
    offset?: number;
  }) {
    this.userId = params.userId;
    this.options = params.options;
    this.filters = params.filters;
    this.limit = params.limit ?? 25;
    this.offset = params.offset ?? 0;
  }
}
