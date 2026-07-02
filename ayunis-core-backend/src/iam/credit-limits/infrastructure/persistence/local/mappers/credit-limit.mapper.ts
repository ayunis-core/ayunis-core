import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { CreditLimit } from '../../../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../../../domain/value-objects/credit-limit-scope.enum';
import type { CreditLimitTarget } from '../../../../domain/value-objects/credit-limit-target';
import {
  CreditLimitRecord,
  UserCreditLimitRecord,
  TeamCreditLimitRecord,
} from '../schema/credit-limit.record';

@Injectable()
export class CreditLimitMapper {
  toRecord(limit: CreditLimit): CreditLimitRecord {
    const { target } = limit;
    const record =
      target.scope === CreditLimitScope.USER
        ? Object.assign(new UserCreditLimitRecord(), {
            userId: target.userId,
          })
        : Object.assign(new TeamCreditLimitRecord(), {
            teamId: target.teamId,
          });
    record.id = limit.id;
    record.orgId = limit.orgId;
    record.monthlyCredits = limit.monthlyCredits;
    record.createdAt = limit.createdAt;
    record.updatedAt = limit.updatedAt;
    return record;
  }

  toDomain(record: CreditLimitRecord): CreditLimit {
    return new CreditLimit({
      id: record.id,
      orgId: record.orgId,
      target: toTarget(record),
      monthlyCredits: record.monthlyCredits,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toDomainArray(records: CreditLimitRecord[]): CreditLimit[] {
    return records.map((record) => this.toDomain(record));
  }
}

function toTarget(record: CreditLimitRecord): CreditLimitTarget {
  if (record instanceof UserCreditLimitRecord) {
    return {
      scope: CreditLimitScope.USER,
      userId: record.userId as UUID,
    };
  }
  if (record instanceof TeamCreditLimitRecord) {
    return {
      scope: CreditLimitScope.TEAM,
      teamId: record.teamId as UUID,
    };
  }

  throw new Error(`Unknown credit limit record subtype for id ${record.id}`);
}
