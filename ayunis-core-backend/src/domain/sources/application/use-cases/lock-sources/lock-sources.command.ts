import type { UUID } from 'crypto';

export class LockSourcesCommand {
  constructor(public readonly sourceIds: UUID[]) {}
}
