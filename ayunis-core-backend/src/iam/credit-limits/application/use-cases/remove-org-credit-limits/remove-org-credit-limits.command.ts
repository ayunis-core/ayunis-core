import type { UUID } from 'crypto';

export class RemoveOrgCreditLimitsCommand {
  constructor(public readonly orgId: UUID) {}
}
