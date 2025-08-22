import { UUID } from 'crypto';

export class FindAllThreadsQuery {
  constructor(
    public readonly userId: UUID,
    public readonly options?: {
      withSources?: boolean;
      withMessages?: boolean;
      withAgent?: boolean;
      withModel?: boolean;
    },
  ) {}
}
