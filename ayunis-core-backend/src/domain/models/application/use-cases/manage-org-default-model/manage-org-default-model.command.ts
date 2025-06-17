import { UUID } from 'crypto';

export class ManageOrgDefaultModelCommand {
  constructor(
    public readonly permittedModelId: UUID,
    public readonly orgId: UUID,
  ) {}
}
