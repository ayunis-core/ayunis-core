import type { UUID } from 'crypto';

export class VerifyUserEmailCommand {
  constructor(
    readonly userId: UUID,
    readonly email: string,
  ) {}
}
