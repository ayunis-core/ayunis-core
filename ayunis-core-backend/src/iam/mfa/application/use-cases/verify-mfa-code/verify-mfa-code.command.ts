import type { UUID } from 'crypto';

export class VerifyMfaCodeCommand {
  constructor(
    public readonly userId: UUID,
    /** Either a 6-digit TOTP code or a recovery code (XXXXX-XXXXX). */
    public readonly code: string,
  ) {}
}
