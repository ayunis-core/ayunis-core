import type { UUID } from 'crypto';

export class SetupTotpCommand {
  constructor(
    public readonly userId: UUID,
    public readonly email: string,
  ) {}
}
