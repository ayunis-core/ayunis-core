import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApiKeyCreditLimit } from 'src/iam/credit-limits/domain/api-key-credit-limit.entity';
import { CreditLimit } from 'src/iam/credit-limits/domain/credit-limit.entity';
import { TeamCreditLimit } from 'src/iam/credit-limits/domain/team-credit-limit.entity';
import { UserCreditLimit } from 'src/iam/credit-limits/domain/user-credit-limit.entity';
import {
  ApiKeyCreditLimitRecord,
  CreditLimitRecord,
  TeamCreditLimitRecord,
  UserCreditLimitRecord,
} from 'src/iam/credit-limits/infrastructure/persistence/local/schema/credit-limit.record';

@Injectable()
export class CreditLimitMapper {
  toRecord(limit: CreditLimit): CreditLimitRecord {
    const record = toTargetRecord(limit);
    record.id = limit.id;
    record.orgId = limit.orgId;
    record.monthlyCredits = limit.monthlyCredits;
    record.createdAt = limit.createdAt;
    record.updatedAt = limit.updatedAt;
    return record;
  }

  toDomain(record: CreditLimitRecord): CreditLimit {
    if (record instanceof UserCreditLimitRecord) {
      return this.toUserDomain(record);
    }
    if (record instanceof TeamCreditLimitRecord) {
      return this.toTeamDomain(record);
    }
    if (record instanceof ApiKeyCreditLimitRecord) {
      return this.toApiKeyDomain(record);
    }
    throw new Error(`Unknown credit limit record subtype for id ${record.id}`);
  }

  toUserDomain(record: UserCreditLimitRecord): UserCreditLimit {
    return new UserCreditLimit({
      id: record.id,
      orgId: record.orgId,
      userId: record.userId as UUID,
      monthlyCredits: record.monthlyCredits,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toTeamDomain(record: TeamCreditLimitRecord): TeamCreditLimit {
    return new TeamCreditLimit({
      id: record.id,
      orgId: record.orgId,
      teamId: record.teamId as UUID,
      monthlyCredits: record.monthlyCredits,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toApiKeyDomain(record: ApiKeyCreditLimitRecord): ApiKeyCreditLimit {
    return new ApiKeyCreditLimit({
      id: record.id,
      orgId: record.orgId,
      apiKeyId: record.apiKeyId as UUID,
      monthlyCredits: record.monthlyCredits,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}

function toTargetRecord(limit: CreditLimit): CreditLimitRecord {
  if (limit instanceof UserCreditLimit) {
    return Object.assign(new UserCreditLimitRecord(), { userId: limit.userId });
  }
  if (limit instanceof TeamCreditLimit) {
    return Object.assign(new TeamCreditLimitRecord(), { teamId: limit.teamId });
  }
  if (limit instanceof ApiKeyCreditLimit) {
    return Object.assign(new ApiKeyCreditLimitRecord(), {
      apiKeyId: limit.apiKeyId,
    });
  }

  throw new Error(`Unknown credit limit subtype for id ${limit.id}`);
}
