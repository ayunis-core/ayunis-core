import { describe, expect, it } from 'vitest';
import { matchesSearch } from './matches-search';

describe('matchesSearch', () => {
  it('matches every item for an empty or blank query', () => {
    expect(matchesSearch('', ['Protokoll'])).toBe(true);
    expect(matchesSearch('   ', ['Protokoll'])).toBe(true);
  });

  it('matches a trimmed, case-insensitive substring of any field', () => {
    expect(matchesSearch('  bauANTRAG ', ['Prüfung', 'Bauantrag prüfen'])).toBe(
      true,
    );
  });

  it('ignores missing fields and reports misses', () => {
    expect(matchesSearch('haushalt', ['Protokoll', null, undefined])).toBe(
      false,
    );
  });
});
