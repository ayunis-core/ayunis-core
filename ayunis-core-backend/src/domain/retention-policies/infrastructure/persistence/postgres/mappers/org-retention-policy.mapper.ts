import { OrgRetentionPolicy } from 'src/domain/retention-policies/domain/org-retention-policy.entity';
import { OrgRetentionPolicyRecord } from '../schema/org-retention-policy.record';

export class OrgRetentionPolicyMapper {
  static toDomain(record: OrgRetentionPolicyRecord): OrgRetentionPolicy {
    return new OrgRetentionPolicy({
      id: record.id,
      orgId: record.orgId,
      retentionDays: record.retentionDays,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: OrgRetentionPolicy): OrgRetentionPolicyRecord {
    const record = new OrgRetentionPolicyRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.retentionDays = domain.retentionDays;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
