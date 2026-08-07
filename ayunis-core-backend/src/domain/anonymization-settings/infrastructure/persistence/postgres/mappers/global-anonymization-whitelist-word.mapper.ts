import { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';
import { GlobalAnonymizationWhitelistWordRecord } from '../schema/global-anonymization-whitelist-word.record';

export class GlobalAnonymizationWhitelistWordMapper {
  static toDomain(
    record: GlobalAnonymizationWhitelistWordRecord,
  ): GlobalAnonymizationWhitelistWord {
    return new GlobalAnonymizationWhitelistWord({
      id: record.id,
      category: record.category,
      word: record.word,
      createdByUserId: record.createdByUserId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toRecord(
    domain: GlobalAnonymizationWhitelistWord,
  ): GlobalAnonymizationWhitelistWordRecord {
    const record = new GlobalAnonymizationWhitelistWordRecord();
    record.id = domain.id;
    record.category = domain.category;
    record.word = domain.word;
    record.wordLowercase = domain.word.toLowerCase();
    record.createdByUserId = domain.createdByUserId;
    record.createdAt = domain.createdAt;
    record.updatedAt = new Date();
    return record;
  }
}
