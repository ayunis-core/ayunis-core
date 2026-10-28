import type { UUID } from 'crypto';

export abstract class UserCountsRepository {
  abstract countByOrgId(orgId: UUID): Promise<number>;
}
