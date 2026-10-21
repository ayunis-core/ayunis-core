import type { UUID } from 'crypto';

export type CollectiveOwner =
  { type: 'team'; teamId: UUID; orgId: UUID } | { type: 'org'; orgId: UUID };
