import { UUID } from 'crypto';

export class FindThreadSourcesQuery {
  constructor(
    public readonly threadId: UUID,
    public readonly userId: UUID,
  ) {}
}
