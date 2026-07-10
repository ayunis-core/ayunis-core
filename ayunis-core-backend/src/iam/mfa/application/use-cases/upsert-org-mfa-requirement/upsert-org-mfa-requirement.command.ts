import type { UUID } from 'crypto';

export class UpsertOrgMfaRequirementCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly required: boolean,
  ) {}
}
