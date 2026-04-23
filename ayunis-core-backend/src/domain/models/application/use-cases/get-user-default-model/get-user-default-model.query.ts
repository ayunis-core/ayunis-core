import type { UUID } from 'crypto';

export class GetUserDefaultModelQuery {
  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
