import type { UUID } from 'crypto';
import type { CreditLimit } from '../../domain/credit-limit.entity';

export abstract class CreditLimitRepository {
  abstract save(limit: CreditLimit): Promise<CreditLimit>;
  abstract findByOrg(orgId: UUID): Promise<CreditLimit[]>;
  abstract findByUserId(orgId: UUID, userId: UUID): Promise<CreditLimit | null>;
  abstract findByTeamId(orgId: UUID, teamId: UUID): Promise<CreditLimit | null>;
  abstract findByTeamIds(orgId: UUID, teamIds: UUID[]): Promise<CreditLimit[]>;
  abstract deleteByUserId(orgId: UUID, userId: UUID): Promise<void>;
  abstract deleteByTeamId(orgId: UUID, teamId: UUID): Promise<void>;
}
