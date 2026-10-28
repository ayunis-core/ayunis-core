import type { UUID } from 'crypto';

export type SkillOwner =
  { type: 'personal' } | { type: 'workspace'; workspaceId: UUID };
