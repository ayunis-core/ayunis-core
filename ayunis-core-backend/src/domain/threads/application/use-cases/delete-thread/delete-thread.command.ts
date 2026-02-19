import type { UUID } from 'crypto';

export class DeleteThreadCommand {
  constructor(public readonly id: UUID) {}
}
