import type { UUID } from 'crypto';

export class AssertSeatAvailableCommand {
  constructor(public readonly orgId: UUID) {}
}
