import { randomUUID } from 'crypto';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';
import { GlobalAnonymizationWhitelistWordMapper } from './global-anonymization-whitelist-word.mapper';

describe('GlobalAnonymizationWhitelistWordMapper', () => {
  it('should preserve all fields on a domain → record → domain round-trip', () => {
    const word = new GlobalAnonymizationWhitelistWord({
      category: PiiCategory.PERSON_NAME,
      word: 'Mitarbeitende',
      createdByUserId: randomUUID(),
    });

    const roundTripped = GlobalAnonymizationWhitelistWordMapper.toDomain(
      GlobalAnonymizationWhitelistWordMapper.toRecord(word),
    );

    expect(roundTripped.id).toBe(word.id);
    expect(roundTripped.category).toBe(word.category);
    expect(roundTripped.word).toBe(word.word);
    expect(roundTripped.createdByUserId).toBe(word.createdByUserId);
    expect(roundTripped.createdAt).toEqual(word.createdAt);
  });

  it('should store a lowercased copy of the word for case-insensitive uniqueness', () => {
    const record = GlobalAnonymizationWhitelistWordMapper.toRecord(
      new GlobalAnonymizationWhitelistWord({
        category: PiiCategory.PERSON_NAME,
        word: 'Führungskräfte',
        createdByUserId: null,
      }),
    );

    expect(record.word).toBe('Führungskräfte');
    expect(record.wordLowercase).toBe('führungskräfte');
  });
});
