import type {
  ResourceOwner,
  TransferableResourceOwner,
} from 'src/domain/ownership/application/models/resource-owner';
import type { ReadableCollectiveOwners } from 'src/iam/teams/application/models/collective-owner.model';

export type SkillOwner = ResourceOwner;

/** The scopes a skill list can be requested for. */
export type SkillListScope = Extract<
  SkillOwner,
  { type: 'personal' | 'workspace' }
>;

/** The team and organization owners whose skills a user can read. */
export type ReadableSkillOwners = ReadableCollectiveOwners;

export type SkillTransferOwner = TransferableResourceOwner;
