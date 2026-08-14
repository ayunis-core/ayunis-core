import type { UUID } from 'crypto';

export class UpdateWorkspaceInstructionCommand {
  constructor(
    public readonly workspaceId: UUID,
    public readonly instruction: string | null,
  ) {}
}
