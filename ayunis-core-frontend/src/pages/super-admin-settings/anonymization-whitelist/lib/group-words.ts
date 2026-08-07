import type { GlobalPiiWhitelistWordDto } from '@/shared/api';
import type { WordsByCategory } from '../model/types';

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
