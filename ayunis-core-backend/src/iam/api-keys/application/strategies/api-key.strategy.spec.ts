import type { UUID } from 'crypto';

import { ApiKey } from '../../domain/api-key.entity';
import { ApiKeyInvalidError, UnexpectedApiKeyError } from '../api-keys.errors';
import { ValidateApiKeyCommand } from '../use-cases/validate-api-key/validate-api-key.command';
import type { ValidateApiKeyUseCase } from '../use-cases/validate-api-key/validate-api-key.use-case';
import { ApiKeyStrategy } from './api-key.strategy';

const ORG_ID = '11111111-2222-3333-4444-555555555555' as UUID;
const KEY_ID = '99999999-aaaa-bbbb-cccc-dddddddddddd' as UUID;

function createValidApiKey(): ApiKey {
  return new ApiKey({
    id: KEY_ID,
    name: 'ci-bot',
    prefix: 'abcdef012345',
    hash: 'bcrypt-hash',
    expiresAt: null,
    orgId: ORG_ID,
    createdByUserId: null,
  });
}

describe('ApiKeyStrategy', () => {
  let validateApiKeyUseCase: jest.Mocked<ValidateApiKeyUseCase>;
  let strategy: ApiKeyStrategy;

  beforeEach(() => {
    validateApiKeyUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateApiKeyUseCase>;
    strategy = new ApiKeyStrategy(validateApiKeyUseCase);
  });

  it('returns false (passing the chain) when the bearer token does not carry the Ayunis API-key prefix', async () => {
    const result = await strategy.validate('eyJhbGciOiJIUzI1NiJ9.foo.bar');
    expect(result).toBe(false);
    expect(validateApiKeyUseCase.execute).not.toHaveBeenCalled();
  });

  it('returns an ActiveApiKey when the use case validates the token', async () => {
    validateApiKeyUseCase.execute.mockResolvedValue(createValidApiKey());

    const principal = await strategy.validate(
      `${ApiKey.KEY_PREFIX}deadbeef00000000`,
    );

    expect(validateApiKeyUseCase.execute).toHaveBeenCalledWith(
      expect.any(ValidateApiKeyCommand),
    );
    if (principal === false) throw new Error('expected ActiveApiKey');
    expect(principal.kind).toBe('apiKey');
    expect(principal.apiKeyId).toBe(KEY_ID);
    expect(principal.orgId).toBe(ORG_ID);
  });

  it('returns false when the use case rejects the token as a domain-level invalid key', async () => {
    validateApiKeyUseCase.execute.mockRejectedValue(new ApiKeyInvalidError());

    const result = await strategy.validate(
      `${ApiKey.KEY_PREFIX}deadbeef00000000`,
    );

    expect(result).toBe(false);
  });

  it('rethrows non-domain failures so Passport surfaces them as strategy errors', async () => {
    const fault = new Error('database is unreachable');
    validateApiKeyUseCase.execute.mockRejectedValue(fault);

    await expect(
      strategy.validate(`${ApiKey.KEY_PREFIX}deadbeef00000000`),
    ).rejects.toBe(fault);
  });

  it('rethrows server-class ApiKeyError (5xx) instead of masking it as 401', async () => {
    const fault = new UnexpectedApiKeyError();
    validateApiKeyUseCase.execute.mockRejectedValue(fault);

    await expect(
      strategy.validate(`${ApiKey.KEY_PREFIX}deadbeef00000000`),
    ).rejects.toBe(fault);
  });
});
