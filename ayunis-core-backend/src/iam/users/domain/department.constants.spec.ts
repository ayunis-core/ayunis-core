import { isValidDepartment } from './department.constants';

describe('isValidDepartment', () => {
  it.each([
    'hauptamt',
    'kaemmerei',
    'ordnungsamt',
    'bauamt',
    'it',
    'pressestelle',
  ])('should accept known department key "%s"', (key) => {
    expect(isValidDepartment(key)).toBe(true);
  });

  it('should accept other:<text> pattern', () => {
    expect(isValidDepartment('other:Wasserwerk')).toBe(true);
    expect(isValidDepartment('other:Stadtwerke GmbH')).toBe(true);
  });

  it('should reject other: with empty text', () => {
    expect(isValidDepartment('other:')).toBe(false);
  });

  it('should reject bare "other" without text suffix', () => {
    expect(isValidDepartment('other')).toBe(false);
  });

  it('should reject unknown department keys', () => {
    expect(isValidDepartment('unknown')).toBe(false);
    expect(isValidDepartment('')).toBe(false);
    expect(isValidDepartment('HAUPTAMT')).toBe(false);
  });
});
