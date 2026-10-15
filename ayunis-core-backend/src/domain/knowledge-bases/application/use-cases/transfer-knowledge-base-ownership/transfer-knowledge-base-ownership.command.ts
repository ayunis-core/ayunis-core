import type { UUID } from 'crypto';

export type KnowledgeBaseTransferTarget =
  { type: 'team'; teamId: UUID } | { type: 'org' };

export class TransferKnowledgeBaseOwnershipCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly requesterId: UUID,
    public readonly target: KnowledgeBaseTransferTarget,
  ) {}
}
