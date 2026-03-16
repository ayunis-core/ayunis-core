import type { UUID } from 'crypto';

export interface TeamMembershipInfo {
  id: UUID;
  orgId: UUID;
  modelOverrideEnabled: boolean;
}

export abstract class TeamMembershipPort {
  abstract findTeamsByUserIdAndOrg(
    userId: UUID,
    orgId: UUID,
  ): Promise<TeamMembershipInfo[]>;
}
