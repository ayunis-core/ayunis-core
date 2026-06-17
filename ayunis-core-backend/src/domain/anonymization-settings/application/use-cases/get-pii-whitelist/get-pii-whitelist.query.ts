import type { UUID } from 'crypto';

export class GetPiiWhitelistQuery {
  constructor(public readonly orgId: UUID) {}
}
