import { validate } from 'class-validator';
import { IsIntegrationConfigSchema } from './is-integration-config-schema.validator';

class TestDto {
  @IsIntegrationConfigSchema()
  config: unknown;
}

const validField = {
  key: 'apiKey',
  label: 'API Key',
  type: 'secret' as const,
  required: true,
};

const validOAuth = {
  authorizationUrl: 'https://example.com/auth',
  tokenUrl: 'https://example.com/token',
  scopes: ['read', 'write'],
  level: 'org' as const,
};

function validSchema(overrides: Record<string, unknown> = {}) {
  return {
    authType: 'api_key',
    orgFields: [validField],
    userFields: [],
    ...overrides,
  };
}

describe('IsIntegrationConfigSchema', () => {
  function createDto(config: unknown): TestDto {
    const dto = new TestDto();
    dto.config = config;
    return dto;
  }

  it('accepts a valid schema without oauth', async () => {
    const errors = await validate(createDto(validSchema()));
    expect(errors).toHaveLength(0);
  });

  it('accepts a valid schema with valid oauth', async () => {
    const errors = await validate(
      createDto(validSchema({ oauth: validOAuth })),
    );
    expect(errors).toHaveLength(0);
  });

  it('rejects missing authType', async () => {
    const errors = await validate(
      createDto(validSchema({ authType: undefined })),
    );
    expect(errors).toHaveLength(1);
  });

  it('rejects non-array orgFields', async () => {
    const errors = await validate(
      createDto(validSchema({ orgFields: 'not-array' })),
    );
    expect(errors).toHaveLength(1);
  });

  it('rejects non-array userFields', async () => {
    const errors = await validate(
      createDto(validSchema({ userFields: 'not-array' })),
    );
    expect(errors).toHaveLength(1);
  });

  it('rejects invalid field object in orgFields (missing required properties)', async () => {
    const errors = await validate(
      createDto(validSchema({ orgFields: [{ key: 'k' }] })),
    );
    expect(errors).toHaveLength(1);
  });

  it('rejects invalid field type (not text/url/secret)', async () => {
    const errors = await validate(
      createDto(
        validSchema({
          orgFields: [{ ...validField, type: 'password' }],
        }),
      ),
    );
    expect(errors).toHaveLength(1);
  });

  it('rejects oauth as a string instead of object', async () => {
    const errors = await validate(
      createDto(validSchema({ oauth: 'not-an-object' })),
    );
    expect(errors).toHaveLength(1);
  });

  it('rejects oauth missing authorizationUrl', async () => {
    const errors = await validate(
      createDto(
        validSchema({
          oauth: {
            tokenUrl: validOAuth.tokenUrl,
            scopes: validOAuth.scopes,
            level: validOAuth.level,
          },
        }),
      ),
    );
    expect(errors).toHaveLength(1);
  });

  it('rejects oauth with non-string tokenUrl', async () => {
    const errors = await validate(
      createDto(validSchema({ oauth: { ...validOAuth, tokenUrl: 123 } })),
    );
    expect(errors).toHaveLength(1);
  });

  it('rejects oauth with non-array scopes', async () => {
    const errors = await validate(
      createDto(
        validSchema({ oauth: { ...validOAuth, scopes: 'read,write' } }),
      ),
    );
    expect(errors).toHaveLength(1);
  });

  it('rejects oauth with invalid level (not org or user)', async () => {
    const errors = await validate(
      createDto(validSchema({ oauth: { ...validOAuth, level: 'admin' } })),
    );
    expect(errors).toHaveLength(1);
  });

  it('accepts oauth with valid minimal config (user level)', async () => {
    const errors = await validate(
      createDto(
        validSchema({
          oauth: { ...validOAuth, level: 'user', scopes: [] },
        }),
      ),
    );
    expect(errors).toHaveLength(0);
  });
});
