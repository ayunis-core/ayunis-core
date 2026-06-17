import { describe, expect, it } from 'vitest';
import { PiiCategory } from '@/shared/api';
import { buildRows, toEntries, validateRows } from './rows';
import { PII_CATEGORIES } from '../model/types';

describe('buildRows', () => {
  it('marks all categories disabled when there are no entries', () => {
    const rows = buildRows([]);

    expect(Object.keys(rows)).toHaveLength(PII_CATEGORIES.length);
    expect(rows[PiiCategory.email_address]).toEqual({
      enabled: false,
      pattern: '',
    });
  });

  it('enables categories from server entries and keeps their patterns', () => {
    const rows = buildRows([
      { category: PiiCategory.email_address, pattern: null },
      { category: PiiCategory.person_name, pattern: 'dani(el)?' },
    ]);

    expect(rows[PiiCategory.email_address]).toEqual({
      enabled: true,
      pattern: '',
    });
    expect(rows[PiiCategory.person_name]).toEqual({
      enabled: true,
      pattern: 'dani(el)?',
    });
    expect(rows[PiiCategory.location].enabled).toBe(false);
  });
});

describe('toEntries', () => {
  it('serializes enabled rows and turns blank patterns into null', () => {
    const rows = buildRows([]);
    rows[PiiCategory.email_address] = { enabled: true, pattern: '  ' };
    rows[PiiCategory.person_name] = { enabled: true, pattern: ' dani ' };

    expect(toEntries(rows)).toEqual([
      { category: PiiCategory.person_name, pattern: 'dani' },
      { category: PiiCategory.email_address, pattern: null },
    ]);
  });
});

describe('validateRows', () => {
  it('reports invalid patterns only for enabled rows', () => {
    const rows = buildRows([]);
    rows[PiiCategory.person_name] = { enabled: true, pattern: '([' };
    rows[PiiCategory.location] = { enabled: false, pattern: '([' };

    expect(validateRows(rows)).toEqual({
      [PiiCategory.person_name]: 'invalid_syntax',
    });
  });
});
