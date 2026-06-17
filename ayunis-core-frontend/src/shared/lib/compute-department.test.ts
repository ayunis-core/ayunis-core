import { describe, it, expect } from 'vitest';
import { computeDepartment } from './compute-department';

describe('computeDepartment', () => {
  it('returns undefined when no department is selected', () => {
    expect(computeDepartment()).toBeUndefined();
    expect(computeDepartment('', '')).toBeUndefined();
  });

  it('returns the department key for standard departments', () => {
    expect(computeDepartment('hauptamt')).toBe('hauptamt');
    expect(computeDepartment('it', '')).toBe('it');
  });

  it('returns prefixed value for "other" with free-text', () => {
    expect(computeDepartment('other', 'Stadtarchiv')).toBe('other:Stadtarchiv');
  });

  it('trims whitespace from the free-text', () => {
    expect(computeDepartment('other', '  Stadtarchiv  ')).toBe(
      'other:Stadtarchiv',
    );
  });

  it('returns undefined for "other" with empty free-text', () => {
    expect(computeDepartment('other', '')).toBeUndefined();
    expect(computeDepartment('other', '   ')).toBeUndefined();
    expect(computeDepartment('other')).toBeUndefined();
  });
});
