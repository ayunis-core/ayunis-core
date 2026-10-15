import type { UUID } from 'crypto';

export type KnowledgeBaseOwner =
  | { type: 'personal' }
  | { type: 'workspace'; workspaceId: UUID }
  | { type: 'team'; teamId: UUID }
  | { type: 'org' };

export type KnowledgeBaseListScope = Extract<
  KnowledgeBaseOwner,
  { type: 'personal' } | { type: 'workspace' }
>;
