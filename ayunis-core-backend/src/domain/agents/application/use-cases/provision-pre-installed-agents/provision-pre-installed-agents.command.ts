import { UUID } from 'crypto';

export class ProvisionPreInstalledAgentsCommand {
  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
  ) {}
}
