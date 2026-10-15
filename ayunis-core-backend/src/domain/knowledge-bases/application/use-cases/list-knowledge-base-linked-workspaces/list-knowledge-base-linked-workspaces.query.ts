import type { UUID } from 'crypto';

export class ListKnowledgeBaseLinkedWorkspacesQuery {
  constructor(public readonly knowledgeBaseId: UUID) {}
}
