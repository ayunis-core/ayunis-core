import type { ConfigField } from './integration-config-schema';
import {
  fieldRequiresInput,
  isConfigValuePresent,
  isSystemFixedField,
  isUserEditableField,
} from './integration-config-schema';

const field = (overrides: Partial<ConfigField> = {}): ConfigField => ({
  key: 'apiKey',
  label: 'API Key',
  type: 'secret',
  required: true,
  ...overrides,
});

describe('integration-config-schema predicates', () => {
  describe('isSystemFixedField', () => {
    it('is true only for a non-empty fixed value', () => {
      expect(isSystemFixedField(field({ value: 'sk-fixed' }))).toBe(true);
    });

    it('is false when value is absent', () => {
      expect(isSystemFixedField(field({ value: undefined }))).toBe(false);
    });

    it('is false for an empty-string value (not a real fixed value)', () => {
      expect(isSystemFixedField(field({ value: '' }))).toBe(false);
    });
  });

  describe('isConfigValuePresent', () => {
    it('is true for a non-empty trimmed string', () => {
      expect(isConfigValuePresent('value')).toBe(true);
    });

    it.each([undefined, null, '', '   '])('is false for %p', (value) => {
      expect(isConfigValuePresent(value)).toBe(false);
    });
  });

  describe('fieldRequiresInput', () => {
    it('is true for a required, non-fixed field', () => {
      expect(fieldRequiresInput(field({ required: true }))).toBe(true);
    });

    it('is false for an optional field', () => {
      expect(fieldRequiresInput(field({ required: false }))).toBe(false);
    });

    it('is false for a required field satisfied by a system-fixed value', () => {
      expect(
        fieldRequiresInput(field({ required: true, value: 'fixed' })),
      ).toBe(false);
    });
  });

  describe('isUserEditableField', () => {
    it('is true for a non-fixed field', () => {
      expect(isUserEditableField(field({ value: undefined }))).toBe(true);
    });

    it('is false for a system-fixed field', () => {
      expect(isUserEditableField(field({ value: 'fixed' }))).toBe(false);
    });
  });
});
