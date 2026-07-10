import type { UUID } from 'crypto';

export class ConfirmTotpCommand {
  constructor(
    public readonly userId: UUID,
    public readonly code: string,
  ) {}
}
