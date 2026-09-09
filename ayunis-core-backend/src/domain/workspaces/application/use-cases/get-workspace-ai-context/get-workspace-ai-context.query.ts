import type { UUID } from 'crypto';

export class GetWorkspaceAiContextQuery {
  constructor(public readonly workspaceId: UUID) {}
}
