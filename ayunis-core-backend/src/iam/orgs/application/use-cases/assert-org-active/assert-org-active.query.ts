import type { UUID } from 'crypto';
export interface AssertOrgActiveQuery {
  orgId: UUID;
  lockForLifecycle?: boolean;
  sessionVersion?: number;
}
