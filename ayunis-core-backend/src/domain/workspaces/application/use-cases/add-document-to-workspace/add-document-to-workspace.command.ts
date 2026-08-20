import type { UUID } from 'crypto';

export class AddDocumentToWorkspaceCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly fileData: Buffer,
    public readonly fileName: string,
    public readonly fileType: string,
  ) {}
}
