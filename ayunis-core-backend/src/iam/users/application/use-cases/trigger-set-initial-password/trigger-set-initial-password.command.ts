import type { UUID } from 'crypto';

export class TriggerSetInitialPasswordCommand {
  constructor(
    public readonly email: string,
    public readonly orgId: UUID,
  ) {}
}
