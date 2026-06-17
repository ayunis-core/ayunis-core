import type { UUID } from 'crypto';

export class AdminUpdateUserCommand {
  constructor(
    public readonly userId: UUID,
    public readonly name?: string,
    public readonly email?: string,
  ) {}
}
