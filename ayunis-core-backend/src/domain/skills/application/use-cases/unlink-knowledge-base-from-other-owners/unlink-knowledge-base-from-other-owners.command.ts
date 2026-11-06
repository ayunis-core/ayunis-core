import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';

export class UnlinkKnowledgeBaseFromOtherOwnersCommand {
  constructor(
    /** The knowledge base as it is owned after the change. */
    public readonly knowledgeBase: KnowledgeBase,
    /** Only count the affected links instead of removing them. */
    public readonly dryRun = false,
  ) {}
}
