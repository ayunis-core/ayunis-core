import { AnonymizationWhitelistEntry } from '../../../../domain/anonymization-whitelist-entry.entity';
import { AnonymizationWhitelistEntryRecord } from '../schema/anonymization-whitelist-entry.record';

export class AnonymizationWhitelistEntryMapper {
  static toDomain(
    record: AnonymizationWhitelistEntryRecord,
  ): AnonymizationWhitelistEntry {
    return new AnonymizationWhitelistEntry({
      id: record.id,
      orgId: record.orgId,
      category: record.category,
      pattern: record.pattern,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(
    domain: AnonymizationWhitelistEntry,
  ): AnonymizationWhitelistEntryRecord {
    const record = new AnonymizationWhitelistEntryRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.category = domain.category;
    record.pattern = domain.pattern;
    record.createdAt = domain.createdAt;
    record.updatedAt = new Date();
    return record;
  }
}
