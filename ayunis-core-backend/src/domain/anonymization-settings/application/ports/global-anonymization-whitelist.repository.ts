import type { UUID } from 'crypto';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { GlobalAnonymizationWhitelistWord } from '../../domain/global-anonymization-whitelist-word.entity';

export abstract class GlobalAnonymizationWhitelistRepository {
  abstract findAll(): Promise<GlobalAnonymizationWhitelistWord[]>;
  abstract findByCategoryAndWord(
    category: PiiCategory,
    word: string,
  ): Promise<GlobalAnonymizationWhitelistWord | null>;
  abstract create(
    word: GlobalAnonymizationWhitelistWord,
  ): Promise<GlobalAnonymizationWhitelistWord>;
  /** Returns false when no word with the given id exists. */
  abstract delete(id: UUID): Promise<boolean>;
}
