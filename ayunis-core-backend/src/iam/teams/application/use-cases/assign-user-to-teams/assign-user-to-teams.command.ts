import type { UUID } from 'crypto';

export class AssignUserToTeamsCommand {
  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly teamIds: UUID[],
  ) {}
}
