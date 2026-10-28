import type { UUID } from 'crypto';

export class DeleteWorkspaceCommand {
  constructor(public readonly id: UUID) {}
}
