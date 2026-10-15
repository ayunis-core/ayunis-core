import type { UUID } from 'crypto';

export type SkillOwner =
  | { type: 'personal' }
  | { type: 'workspace'; workspaceId: UUID }
  | { type: 'team'; teamId: UUID }
  | { type: 'org' };

export type SkillListScope = Extract<
  SkillOwner,
  { type: 'personal' } | { type: 'workspace' }
>;
