import { describe, expect, it } from 'vitest';
import { PiiCategory } from '@/shared/api';
import type { GlobalPiiWhitelistWordDto } from '@/shared/api';
import { groupWordsByCategory } from './group-words';

function word(category: PiiCategory, text: string): GlobalPiiWhitelistWordDto {
  return {
    id: `id-${text}`,
    category,
    word: text,
    createdByEmail: null,
    createdAt: '2026-08-06T12:00:00.000Z',
  };
}

describe('groupWordsByCategory', () => {
  it('groups words under their category preserving order', () => {
    const words = [
      word(PiiCategory.person_name, 'Mitarbeitende'),
      word(PiiCategory.organization, 'Stadtverwaltung'),
      word(PiiCategory.person_name, 'Menschen'),
    ];

    const grouped = groupWordsByCategory(words);

    expect(grouped[PiiCategory.person_name]?.map((w) => w.word)).toEqual([
      'Mitarbeitende',
      'Menschen',
    ]);
    expect(grouped[PiiCategory.organization]).toHaveLength(1);
    expect(grouped[PiiCategory.location]).toBeUndefined();
  });

  it('returns an empty object for an empty list', () => {
    expect(groupWordsByCategory([])).toEqual({});
  });
});
