import type { UUID } from 'crypto';

export class DeleteUserDefaultModelCommand {
  constructor(public readonly userId: UUID) {}
}
