import type { UUID } from 'crypto';

export class AdmitOrgProcessingQuery {
  constructor(public readonly orgId: UUID) {}
}
