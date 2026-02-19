import type { UUID } from 'crypto';

export class DeleteModelCommand {
  constructor(public readonly id: UUID) {}
}
