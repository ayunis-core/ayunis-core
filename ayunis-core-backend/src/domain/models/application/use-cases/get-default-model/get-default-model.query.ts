import { UUID } from 'crypto';

export class GetDefaultModelQuery {
  constructor(
    public readonly orgId: UUID,
    public readonly userId?: UUID,
  ) {}
}
