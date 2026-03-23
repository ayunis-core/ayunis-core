import type { UUID } from 'crypto';

export class DeleteSourcesCommand {
  constructor(public readonly sourceIds: UUID[]) {}
}
