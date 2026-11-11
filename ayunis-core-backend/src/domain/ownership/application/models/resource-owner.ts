import type { UUID } from 'crypto';

/** Who owns a resource such as a skill or a knowledge base. */
export type ResourceOwner =
  | { type: 'personal' }
  | { type: 'workspace'; workspaceId: UUID }
  | { type: 'team'; teamId: UUID }
  | { type: 'org' };

/** The owners a resource can be moved between; workspace resources stay put. */
export type TransferableResourceOwner = Exclude<
  ResourceOwner,
  { type: 'workspace' }
>;
