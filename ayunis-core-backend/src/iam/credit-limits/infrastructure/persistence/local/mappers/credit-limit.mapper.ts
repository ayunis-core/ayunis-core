import { Injectable } from '@nestjs/common';
import { CreditLimit } from '../../../../domain/credit-limit.entity';
import { CreditLimitRecord } from '../schema/credit-limit.record';

@Injectable()
export class CreditLimitMapper {
  toRecord(limit: CreditLimit): CreditLimitRecord {
    const record = new CreditLimitRecord();
    record.id = limit.id;
    record.orgId = limit.orgId;
    record.scope = limit.scope;
    record.targetUserId = limit.targetUserId;
    record.targetTeamId = limit.targetTeamId;
    record.monthlyCredits = limit.monthlyCredits;
    record.createdAt = limit.createdAt;
    record.updatedAt = limit.updatedAt;
    return record;
  }

  toDomain(record: CreditLimitRecord): CreditLimit {
    return new CreditLimit({
      id: record.id,
      orgId: record.orgId,
      scope: record.scope,
      targetUserId: record.targetUserId,
      targetTeamId: record.targetTeamId,
      monthlyCredits: record.monthlyCredits,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toDomainArray(records: CreditLimitRecord[]): CreditLimit[] {
    return records.map((record) => this.toDomain(record));
  }
}
