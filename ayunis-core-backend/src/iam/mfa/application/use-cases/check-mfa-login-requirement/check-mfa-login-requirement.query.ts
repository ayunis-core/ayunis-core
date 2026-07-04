import type { UUID } from 'crypto';

export class CheckMfaLoginRequirementQuery {
  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
