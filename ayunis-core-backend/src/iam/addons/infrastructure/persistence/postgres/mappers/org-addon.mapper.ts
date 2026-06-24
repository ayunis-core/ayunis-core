import { OrgAddon } from 'src/iam/addons/domain/org-addon.entity';
import { OrgAddonRecord } from '../schema/org-addon.record';

export class OrgAddonMapper {
  static toDomain(record: OrgAddonRecord): OrgAddon {
    return new OrgAddon({
      id: record.id,
      orgId: record.orgId,
      type: record.type,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: OrgAddon): OrgAddonRecord {
    const record = new OrgAddonRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.type = domain.type;
    record.createdAt = domain.createdAt;
    record.updatedAt = new Date();
    return record;
  }
}
