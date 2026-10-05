import type { UUID } from 'crypto';
export class DeleteOrgCommand {
  constructor(
    public readonly id: UUID,
    public readonly confirmationName?: string,
    public readonly requireCompleteCleanup = false,
  ) {}
}
