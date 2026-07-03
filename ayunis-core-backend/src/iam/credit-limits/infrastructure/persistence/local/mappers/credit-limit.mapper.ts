import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { CreditLimit } from '../../../../domain/credit-limit.entity';
import { UserCreditLimit } from '../../../../domain/user-credit-limit.entity';
import { TeamCreditLimit } from '../../../../domain/team-credit-limit.entity';
import {
  CreditLimitRecord,
  UserCreditLimitRecord,
  TeamCreditLimitRecord,
} from '../schema/credit-limit.record';

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
}

function toTargetRecord(limit: CreditLimit): CreditLimitRecord {
  if (limit instanceof UserCreditLimit) {
    return Object.assign(new UserCreditLimitRecord(), { userId: limit.userId });
  }
  if (limit instanceof TeamCreditLimit) {
    return Object.assign(new TeamCreditLimitRecord(), { teamId: limit.teamId });
  }

  throw new Error(`Unknown credit limit subtype for id ${limit.id}`);
}
