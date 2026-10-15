import type { UUID } from 'crypto';

export type HandoverDecision = 'approve' | 'reject' | 'withdraw';

export class DecideHandoverRequestCommand {
  constructor(
    public readonly requestId: UUID,
    public readonly decision: HandoverDecision,
  ) {}
}
