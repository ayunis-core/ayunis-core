import type { UUID } from 'crypto';

export class GetUsageConfigQuery {
  constructor(public readonly orgId?: UUID) {}
}
