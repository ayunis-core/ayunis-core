import { UUID } from 'crypto';

export class ManageUserDefaultModelCommand {
  constructor(
    public readonly userId: UUID,
    public readonly permittedModelId: UUID,
    public readonly orgId: UUID,
  ) {}
}
