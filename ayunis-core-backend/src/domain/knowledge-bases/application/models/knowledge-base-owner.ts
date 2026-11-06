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

/** The owners a knowledge base can be moved between; workspace ones stay put. */
export type KnowledgeBaseTransferOwner = Exclude<
  KnowledgeBaseOwner,
  { type: 'workspace' }
>;
