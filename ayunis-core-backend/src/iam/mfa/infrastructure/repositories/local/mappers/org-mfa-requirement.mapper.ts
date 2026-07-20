import { OrgMfaRequirement } from 'src/iam/mfa/domain/org-mfa-requirement.entity';
import { OrgMfaRequirementRecord } from '../schema/org-mfa-requirement.record';

export class OrgMfaRequirementMapper {
  static toDomain(record: OrgMfaRequirementRecord): OrgMfaRequirement {
    return new OrgMfaRequirement({
      id: record.id,
      orgId: record.orgId,
      required: record.required,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: OrgMfaRequirement): OrgMfaRequirementRecord {
    const record = new OrgMfaRequirementRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.required = domain.required;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
