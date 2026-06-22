import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { CreditLimit } from '../../../../domain/credit-limit.entity';
import { CreditLimitScope } from '../../../../domain/value-objects/credit-limit-scope.enum';
import type { CreditLimitTarget } from '../../../../domain/value-objects/credit-limit-target';
import { CreditLimitRecord } from '../schema/credit-limit.record';

@Injectable()
export class CreditLimitMapper {
  toRecord(limit: CreditLimit): CreditLimitRecord {
    const record = new CreditLimitRecord();
    record.id = limit.id;
    record.orgId = limit.orgId;
    record.scope = limit.target.scope;
    record.targetUserId =
      limit.target.scope === CreditLimitScope.USER ? limit.target.userId : null;
    record.targetTeamId =
      limit.target.scope === CreditLimitScope.TEAM ? limit.target.teamId : null;
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

// The DB guarantees the matching column is non-null (CHK_credit_limit_target_xor),
// so the cast is safe here — this is the single trusted persistence boundary.
function toTarget(record: CreditLimitRecord): CreditLimitTarget {
  return record.scope === CreditLimitScope.USER
    ? { scope: CreditLimitScope.USER, userId: record.targetUserId as UUID }
    : { scope: CreditLimitScope.TEAM, teamId: record.targetTeamId as UUID };
}
