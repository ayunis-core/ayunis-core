import type { UUID } from 'crypto';

export class SetKnowledgeBaseActivationCommand {
  constructor(
    public readonly knowledgeBaseId: UUID,
    public readonly isActive: boolean,
  ) {}
}
