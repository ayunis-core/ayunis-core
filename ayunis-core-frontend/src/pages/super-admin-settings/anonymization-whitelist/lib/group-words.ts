import type { GlobalPiiWhitelistWordDto } from '@ayunis/api-client';
import type { WordsByCategory } from '@/pages/super-admin-settings/anonymization-whitelist/model/types';

export function groupWordsByCategory(
  words: GlobalPiiWhitelistWordDto[],
): WordsByCategory {
  const grouped: WordsByCategory = {};
  for (const word of words) {
    const list = grouped[word.category] ?? [];
    list.push(word);
    grouped[word.category] = list;
  }
  return grouped;
}
