import type { UUID } from 'crypto';
import type { CreditLimit } from '../../domain/credit-limit.entity';
import type { UserCreditLimit } from '../../domain/user-credit-limit.entity';
import type { TeamCreditLimit } from '../../domain/team-credit-limit.entity';

export abstract class CreditLimitRepository {
  abstract save<T extends CreditLimit>(limit: T): Promise<T>;
  abstract findUserLimits(orgId: UUID): Promise<UserCreditLimit[]>;
  abstract findTeamLimits(orgId: UUID): Promise<TeamCreditLimit[]>;
  abstract findByUserId(
    orgId: UUID,
    userId: UUID,
  ): Promise<UserCreditLimit | null>;
  abstract findByTeamId(
    orgId: UUID,
    teamId: UUID,
  ): Promise<TeamCreditLimit | null>;
  abstract findByTeamIds(
    orgId: UUID,
    teamIds: UUID[],
  ): Promise<TeamCreditLimit[]>;
  abstract deleteByUserId(orgId: UUID, userId: UUID): Promise<void>;
  abstract deleteByTeamId(orgId: UUID, teamId: UUID): Promise<void>;
  abstract deleteByOrg(orgId: UUID): Promise<void>;
}
