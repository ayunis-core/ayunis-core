import type { UUID } from 'crypto';

export class DeleteSourceCommand {
  constructor(public readonly sourceId: UUID) {}
}
