import { UUID } from 'crypto';

export class PermitAllModelsForOrgCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly userId?: UUID, // Optional: required for legal acceptance creation
  ) {}
}
