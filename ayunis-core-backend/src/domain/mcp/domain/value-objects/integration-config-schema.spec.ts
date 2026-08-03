import type { ConfigField } from './integration-config-schema';
import {
  fieldRequiresInput,
  isConfigValuePresent,
  isSystemFixedField,
  isUserEditableField,
  normalizeIntegrationConfigSchema,
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

  describe('normalizeIntegrationConfigSchema', () => {
    it('trims, removes empty values, and deduplicates OAuth scopes', () => {
      const result = normalizeIntegrationConfigSchema({
        authType: 'OAUTH',
        orgFields: [],
        userFields: [],
        oauth: {
          clientRegistration: 'automatic',
          scopes: [' openid ', '', 'profile', 'openid', '   '],
        },
      });

      expect(result.oauth?.scopes).toEqual(['openid', 'profile']);
    });

    it.each([
      {
        authType: 'OAUTH',
        oauth: undefined,
      },
      {
        authType: 'NO_AUTH',
        oauth: { clientRegistration: 'automatic' as const },
      },
    ])(
      'rejects mismatched OAuth presence for $authType',
      ({ authType, oauth }) => {
        expect(() =>
          normalizeIntegrationConfigSchema({
            authType,
            orgFields: [],
            userFields: [],
            oauth,
          }),
        ).toThrow(
          'OAuth configuration must be present if and only if authType is OAUTH',
        );
      },
    );

    it('rejects Authorization header mappings for OAuth integrations', () => {
      expect(() =>
        normalizeIntegrationConfigSchema({
          authType: 'OAUTH',
          orgFields: [],
          userFields: [
            {
              key: 'legacyToken',
              label: 'Legacy token',
              type: 'secret',
              required: false,
              headerName: ' authorization ',
            },
          ],
          oauth: { clientRegistration: 'static' },
        }),
      ).toThrow('OAuth configuration fields cannot map to Authorization');
    });

    it.each([undefined, 'manual'])(
      'rejects invalid OAuth client registration mode %p',
      (clientRegistration) => {
        expect(() =>
          normalizeIntegrationConfigSchema({
            authType: 'OAUTH',
            orgFields: [],
            userFields: [],
            oauth: { clientRegistration: clientRegistration as never },
          }),
        ).toThrow('OAuth clientRegistration must be automatic or static');
      },
    );
  });
});
