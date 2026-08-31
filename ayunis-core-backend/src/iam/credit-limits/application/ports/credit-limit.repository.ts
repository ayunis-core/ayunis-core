import type { UUID } from 'crypto';
import type { ApiKeyCreditLimit } from 'src/iam/credit-limits/domain/api-key-credit-limit.entity';
import type { CreditLimit } from 'src/iam/credit-limits/domain/credit-limit.entity';
import type { TeamCreditLimit } from 'src/iam/credit-limits/domain/team-credit-limit.entity';
import type { UserCreditLimit } from 'src/iam/credit-limits/domain/user-credit-limit.entity';

export abstract class CreditLimitRepository {
  abstract save<T extends CreditLimit>(limit: T): Promise<T>;
  abstract findUserLimits(orgId: UUID): Promise<UserCreditLimit[]>;
  abstract findTeamLimits(orgId: UUID): Promise<TeamCreditLimit[]>;
  abstract findApiKeyLimits(orgId: UUID): Promise<ApiKeyCreditLimit[]>;
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
  abstract findByApiKeyId(
    orgId: UUID,
    apiKeyId: UUID,
  ): Promise<ApiKeyCreditLimit | null>;
  abstract deleteByUserId(orgId: UUID, userId: UUID): Promise<void>;
  abstract deleteByTeamId(orgId: UUID, teamId: UUID): Promise<void>;
  abstract deleteByApiKeyId(orgId: UUID, apiKeyId: UUID): Promise<void>;
  abstract deleteByOrg(orgId: UUID): Promise<void>;
}
