import { Injectable } from '@nestjs/common';
import { OrgAcademyAccessSettings } from 'src/iam/academy-access/domain/org-academy-access-settings.entity';
import { OrgAcademyAccessSettingsRecord } from '../schema/org-academy-access-settings.record';

@Injectable()
export class OrgAcademyAccessSettingsMapper {
  toDomain(record: OrgAcademyAccessSettingsRecord): OrgAcademyAccessSettings {
    return new OrgAcademyAccessSettings({
      id: record.id,
      orgId: record.orgId,
      mode: record.mode,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: OrgAcademyAccessSettings): OrgAcademyAccessSettingsRecord {
    const record = new OrgAcademyAccessSettingsRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.mode = domain.mode;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
