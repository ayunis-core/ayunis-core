import type { UUID } from 'crypto';
import type { ReadableCollectiveOwners } from 'src/iam/teams/application/models/collective-owner.model';

export type CollectiveSkillOwner =
  { type: 'team'; teamId: UUID } | { type: 'org' };

export type SkillOwner =
  | { type: 'personal' }
  | { type: 'workspace'; workspaceId: UUID }
  | CollectiveSkillOwner;

/** The scopes a skill list can be requested for. */
export type SkillListScope = Extract<
  SkillOwner,
  { type: 'personal' | 'workspace' }
>;

/** The team and organization owners whose skills a user can read. */
export type ReadableSkillOwners = ReadableCollectiveOwners;
