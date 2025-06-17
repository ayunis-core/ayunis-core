import { UUID } from 'crypto';

export class FindManyToolsQuery {
  constructor(
    public readonly toolIds: UUID[],
    public readonly userId: UUID,
  ) {}
}
