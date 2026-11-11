import type { UUID } from 'crypto';

export class RemoveMcpToolAllowanceCommand {
  constructor(public readonly allowanceId: UUID) {}
}
