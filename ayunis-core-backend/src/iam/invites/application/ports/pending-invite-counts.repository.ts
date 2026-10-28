import type { UUID } from 'crypto';

export abstract class PendingInviteCountsRepository {
  abstract countByOrgId(orgId: UUID): Promise<number>;
}
