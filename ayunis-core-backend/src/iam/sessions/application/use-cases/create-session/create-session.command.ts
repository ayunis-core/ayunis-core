import type { UUID } from 'crypto';

export class CreateSessionCommand {
  constructor(public readonly userId: UUID) {}
}
