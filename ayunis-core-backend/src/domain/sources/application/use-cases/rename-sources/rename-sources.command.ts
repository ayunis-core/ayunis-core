import type { UUID } from 'crypto';

export class RenameSourcesCommand {
  constructor(public readonly renames: { sourceId: UUID; name: string }[]) {}
}
