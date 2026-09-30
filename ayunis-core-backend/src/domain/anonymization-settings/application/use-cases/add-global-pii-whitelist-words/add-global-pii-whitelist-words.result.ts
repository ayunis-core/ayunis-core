import type { GlobalAnonymizationWhitelistWord } from 'src/domain/anonymization-settings/domain/global-anonymization-whitelist-word.entity';

export interface AddGlobalPiiWhitelistWordsResult {
  added: GlobalAnonymizationWhitelistWord[];
  /** Submitted words that were already whitelisted for the category. */
  duplicates: string[];
}
