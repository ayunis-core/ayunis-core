import { Branding } from '../../../../domain/branding.entity';
import { BrandingRecord } from '../schema/branding.record';

export class BrandingMapper {
  static toDomain(record: BrandingRecord): Branding {
    return new Branding({
      id: record.id,
      orgId: record.orgId,
      displayName: record.displayName,
      faviconStoragePath: record.faviconStoragePath,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(domain: Branding): BrandingRecord {
    const record = new BrandingRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.displayName = domain.displayName;
    record.faviconStoragePath = domain.faviconStoragePath;
    record.createdAt = domain.createdAt;
    record.updatedAt = new Date();
    return record;
  }
}
