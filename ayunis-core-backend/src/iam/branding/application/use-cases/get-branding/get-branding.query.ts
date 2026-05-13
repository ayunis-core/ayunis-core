import type { UUID } from 'crypto';

export class GetBrandingQuery {
  constructor(public readonly orgId: UUID) {}
}
