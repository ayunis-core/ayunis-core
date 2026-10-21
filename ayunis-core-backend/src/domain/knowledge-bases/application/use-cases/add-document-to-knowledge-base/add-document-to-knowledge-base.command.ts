import type { UUID } from 'crypto';

export class AddDocumentToKnowledgeBaseCommand {
  readonly knowledgeBaseId: UUID;
  readonly file: { path: string; name: string; type: string };

  constructor(params: {
    knowledgeBaseId: UUID;
    file: { path: string; name: string; type: string };
  }) {
    this.knowledgeBaseId = params.knowledgeBaseId;
    this.file = params.file;
  }
}
