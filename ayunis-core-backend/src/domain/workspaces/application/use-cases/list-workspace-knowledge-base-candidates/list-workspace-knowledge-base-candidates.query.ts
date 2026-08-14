import type { UUID } from 'crypto';

export class ListWorkspaceKnowledgeBaseCandidatesQuery {
  constructor(public readonly workspaceId: UUID) {}
}
