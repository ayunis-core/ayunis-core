import type { UUID } from 'crypto';
import type { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';

export abstract class GlobalAnonymizationWhitelistRepository {
  abstract findAll(): Promise<GlobalAnonymizationWhitelistWord[]>;
  /**
   * Inserts the given words, skipping the ones already whitelisted for their
   * category (case-insensitive). Returns only the words that were created, so
   * callers can tell added from skipped without a check-then-act race.
   */
  abstract createMany(
    words: GlobalAnonymizationWhitelistWord[],
  ): Promise<GlobalAnonymizationWhitelistWord[]>;
  /** Returns false when no word with the given id exists. */
  abstract delete(id: UUID): Promise<boolean>;
}
