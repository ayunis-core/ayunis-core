import type { UUID } from 'crypto';
import type { KnowledgeBaseTransferOwner } from 'src/domain/knowledge-bases/application/models/knowledge-base-owner';

export class ChangeKnowledgeBaseOwnerCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly owner: KnowledgeBaseTransferOwner,
  ) {}
}
