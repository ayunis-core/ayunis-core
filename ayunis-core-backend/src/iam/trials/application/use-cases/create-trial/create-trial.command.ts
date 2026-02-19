import type { UUID } from 'crypto';

export class CreateTrialCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly maxMessages: number,
  ) {}
}
