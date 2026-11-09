import type { UUID } from 'crypto';

export type KnowledgeBaseOwner =
  | { type: 'personal' }
  | { type: 'workspace'; workspaceId: UUID }
  | { type: 'team'; teamId: UUID }
  | { type: 'org' };

/** The scopes a knowledge-base list can be requested for. */
export type KnowledgeBaseListScope = Extract<
  KnowledgeBaseOwner,
  { type: 'personal' | 'workspace' }
>;
