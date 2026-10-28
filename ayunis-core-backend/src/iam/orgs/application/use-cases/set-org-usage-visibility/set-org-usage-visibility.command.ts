import type { UUID } from 'crypto';

export interface SetOrgUsageVisibilityCommand {
  orgId: UUID;
  hideIndividualUsage: boolean;
}
