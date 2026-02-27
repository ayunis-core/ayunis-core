import type { UUID } from 'crypto';

export class ListKnowledgeBaseDocumentsQuery {
  constructor(public readonly knowledgeBaseId: UUID) {}
}
