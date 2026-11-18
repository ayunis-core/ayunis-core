import type { UUID } from 'crypto';

export class UpdateTeamPermittedModelCommand {
  constructor(
    public readonly permittedModelId: UUID,
    public readonly orgId: UUID,
    public readonly teamId: UUID,
    /** Omitted switches keep their stored value. */
    public readonly policy: {
      readonly anonymousOnly?: boolean;
      readonly memoryAccess?: boolean;
      readonly chatHistoryAccess?: boolean;
    },
  ) {}
}
