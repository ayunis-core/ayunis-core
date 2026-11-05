import type { UUID } from 'crypto';

export class DeleteUnreferencedSourcesCommand {
  constructor(
    public readonly sourceIds: UUID[],
    public readonly orgId: UUID,
  ) {}
}
