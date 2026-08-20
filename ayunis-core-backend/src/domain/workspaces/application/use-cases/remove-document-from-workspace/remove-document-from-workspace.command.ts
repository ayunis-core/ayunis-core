import type { UUID } from 'crypto';

export class RemoveDocumentFromWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly sourceId: UUID,
  ) {}
}
