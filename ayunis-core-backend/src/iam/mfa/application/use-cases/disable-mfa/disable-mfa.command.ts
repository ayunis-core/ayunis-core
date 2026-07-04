import type { UUID } from 'crypto';

export class DisableMfaCommand {
  constructor(
    public readonly userId: UUID,
    public readonly orgId: UUID,
    public readonly code: string,
  ) {}
}
