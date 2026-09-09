import type { UUID } from 'crypto';

export type KnowledgeBaseOwner =
  { type: 'personal' } | { type: 'workspace'; workspaceId: UUID };
