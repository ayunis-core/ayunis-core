import type { UUID } from 'crypto';

export class AuthorizeUserLoginCommand {
  constructor(public readonly userId: UUID) {}
}
