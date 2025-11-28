import { UUID } from 'crypto';

export class UpdateTrialCommand {
  constructor(
    public readonly orgId: UUID,
    public readonly maxMessages?: number,
    public readonly messagesSent?: number,
  ) {}
}
