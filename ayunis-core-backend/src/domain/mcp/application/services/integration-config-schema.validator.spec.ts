import { validateConfigSchema } from './integration-config-schema.validator';
import { McpInvalidConfigSchemaError } from '../mcp.errors';
import type { IntegrationConfigSchema } from '../../domain/value-objects/integration-config-schema';

describe('validateConfigSchema', () => {
  const validField = {
    key: 'api_key',
    label: 'API Key',
    type: 'secret',
    headerName: 'Authorization',
    prefix: 'Bearer ',
    required: true,
    help: 'Your API key',
  };

  const minimalSchema = {
    authType: 'HEADER',
    orgFields: [validField],
    userFields: [],
  };

  it('should validate a minimal valid schema', () => {
    const result = validateConfigSchema(minimalSchema);
    expect(result.authType).toBe('HEADER');
    expect(result.orgFields).toHaveLength(1);
    expect(result.orgFields[0].key).toBe('api_key');
    expect(result.userFields).toHaveLength(0);
    expect(result.oauth).toBeUndefined();
  });

  it('should validate a schema with oauth block', () => {
    const schema = {
      ...minimalSchema,
      oauth: {
        authorizationUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        scopes: ['read', 'write'],
        level: 'org',
      },
    };
    const result = validateConfigSchema(schema);
    expect(result.oauth).toBeDefined();
    expect(result.oauth!.level).toBe('org');
    expect(result.oauth!.scopes).toEqual(['read', 'write']);
  });

  it('should validate a schema with user-level oauth', () => {
    const schema = {
      ...minimalSchema,
      oauth: {
        authorizationUrl: 'https://auth.example.com/authorize',
        tokenUrl: 'https://auth.example.com/token',
        scopes: [],
        level: 'user',
      },
    };
    const result = validateConfigSchema(schema);
    expect(result.oauth!.level).toBe('user');
  });

  it('should accept optional field properties as undefined', () => {
    const field = {
      key: 'name',
      label: 'Name',
      type: 'text',
      required: false,
    };
    const result = validateConfigSchema({
      authType: 'NONE',
      orgFields: [field],
      userFields: [],
    });
    expect(result.orgFields[0].headerName).toBeUndefined();
    expect(result.orgFields[0].prefix).toBeUndefined();
    expect(result.orgFields[0].help).toBeUndefined();
    expect(result.orgFields[0].value).toBeUndefined();
  });

  it('should accept field with fixed value', () => {
    const field = {
      ...validField,
      value: 'fixed-value',
    };
    const result = validateConfigSchema({
      authType: 'HEADER',
      orgFields: [field],
      userFields: [],
    });
    expect(result.orgFields[0].value).toBe('fixed-value');
  });

  describe('top-level validation', () => {
    it('should reject null', () => {
      expect(() => validateConfigSchema(null)).toThrow(
        McpInvalidConfigSchemaError,
      );
    });

    it('should reject an array', () => {
      expect(() => validateConfigSchema([])).toThrow(
        McpInvalidConfigSchemaError,
      );
    });

    it('should reject a non-object', () => {
      expect(() => validateConfigSchema('string')).toThrow(
        McpInvalidConfigSchemaError,
      );
    });

    it('should reject missing authType', () => {
      expect(() =>
        validateConfigSchema({ orgFields: [], userFields: [] }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject empty authType', () => {
      expect(() =>
        validateConfigSchema({
          authType: '',
          orgFields: [],
          userFields: [],
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject missing orgFields', () => {
      expect(() =>
        validateConfigSchema({ authType: 'NONE', userFields: [] }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject missing userFields', () => {
      expect(() =>
        validateConfigSchema({ authType: 'NONE', orgFields: [] }),
      ).toThrow(McpInvalidConfigSchemaError);
    });
  });

  describe('field validation', () => {
    it('should reject field without key', () => {
      expect(() =>
        validateConfigSchema({
          authType: 'NONE',
          orgFields: [{ label: 'X', type: 'text', required: false }],
          userFields: [],
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject field with empty key', () => {
      expect(() =>
        validateConfigSchema({
          authType: 'NONE',
          orgFields: [{ key: '', label: 'X', type: 'text', required: false }],
          userFields: [],
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject field without label', () => {
      expect(() =>
        validateConfigSchema({
          authType: 'NONE',
          orgFields: [{ key: 'k', type: 'text', required: false }],
          userFields: [],
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject field with invalid type', () => {
      expect(() =>
        validateConfigSchema({
          authType: 'NONE',
          orgFields: [
            { key: 'k', label: 'L', type: 'number', required: false },
          ],
          userFields: [],
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject field without required', () => {
      expect(() =>
        validateConfigSchema({
          authType: 'NONE',
          orgFields: [{ key: 'k', label: 'L', type: 'text' }],
          userFields: [],
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject non-string headerName', () => {
      expect(() =>
        validateConfigSchema({
          authType: 'NONE',
          orgFields: [
            {
              key: 'k',
              label: 'L',
              type: 'text',
              required: false,
              headerName: 123,
            },
          ],
          userFields: [],
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject non-object field', () => {
      expect(() =>
        validateConfigSchema({
          authType: 'NONE',
          orgFields: ['not-an-object'],
          userFields: [],
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should validate userFields the same way', () => {
      expect(() =>
        validateConfigSchema({
          authType: 'NONE',
          orgFields: [],
          userFields: [{ key: '', label: 'X', type: 'text', required: false }],
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });
  });

  describe('oauth validation', () => {
    it('should reject oauth without authorizationUrl', () => {
      expect(() =>
        validateConfigSchema({
          ...minimalSchema,
          oauth: {
            tokenUrl: 'https://example.com/token',
            scopes: [],
            level: 'org',
          },
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject oauth without tokenUrl', () => {
      expect(() =>
        validateConfigSchema({
          ...minimalSchema,
          oauth: {
            authorizationUrl: 'https://example.com/auth',
            scopes: [],
            level: 'org',
          },
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject oauth with non-array scopes', () => {
      expect(() =>
        validateConfigSchema({
          ...minimalSchema,
          oauth: {
            authorizationUrl: 'https://example.com/auth',
            tokenUrl: 'https://example.com/token',
            scopes: 'read',
            level: 'org',
          },
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject oauth with invalid level', () => {
      expect(() =>
        validateConfigSchema({
          ...minimalSchema,
          oauth: {
            authorizationUrl: 'https://example.com/auth',
            tokenUrl: 'https://example.com/token',
            scopes: [],
            level: 'global',
          },
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject oauth as non-object', () => {
      expect(() =>
        validateConfigSchema({
          ...minimalSchema,
          oauth: 'not-an-object',
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });

    it('should reject oauth scopes with non-string entries', () => {
      expect(() =>
        validateConfigSchema({
          ...minimalSchema,
          oauth: {
            authorizationUrl: 'https://example.com/auth',
            tokenUrl: 'https://example.com/token',
            scopes: ['read', 123],
            level: 'org',
          },
        }),
      ).toThrow(McpInvalidConfigSchemaError);
    });
  });

  describe('error field paths', () => {
    it('should include field path for orgFields errors', () => {
      try {
        validateConfigSchema({
          authType: 'NONE',
          orgFields: [
            { key: 'ok', label: 'OK', type: 'text', required: true },
            { key: '', label: 'Bad', type: 'text', required: true },
          ],
          userFields: [],
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(McpInvalidConfigSchemaError);
        expect((error as McpInvalidConfigSchemaError).metadata).toEqual(
          expect.objectContaining({ field: '/orgFields/1/key' }),
        );
      }
    });

    it('should include field path for oauth errors', () => {
      try {
        validateConfigSchema({
          ...minimalSchema,
          oauth: {
            authorizationUrl: '',
            tokenUrl: 'https://example.com/token',
            scopes: [],
            level: 'org',
          },
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(McpInvalidConfigSchemaError);
        expect((error as McpInvalidConfigSchemaError).metadata).toEqual(
          expect.objectContaining({ field: '/oauth/authorizationUrl' }),
        );
      }
    });
  });

  describe('return type shape', () => {
    it('should return a proper IntegrationConfigSchema', () => {
      const result: IntegrationConfigSchema =
        validateConfigSchema(minimalSchema);
      expect(result).toEqual({
        authType: 'HEADER',
        orgFields: [
          {
            key: 'api_key',
            label: 'API Key',
            type: 'secret',
            headerName: 'Authorization',
            prefix: 'Bearer ',
            required: true,
            help: 'Your API key',
            value: undefined,
          },
        ],
        userFields: [],
      });
    });
  });
});
