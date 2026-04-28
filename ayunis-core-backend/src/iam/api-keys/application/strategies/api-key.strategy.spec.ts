import type { UUID } from 'crypto';
import type { Request } from 'express';

import { ApiKey } from '../../domain/api-key.entity';
import { ApiKeyInvalidError } from '../api-keys.errors';
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

function createMockRequest(authorization?: string): Request {
  return {
    headers: authorization ? { authorization } : {},
  } as Request;
}

describe('ApiKeyStrategy', () => {
  let validateApiKeyUseCase: jest.Mocked<ValidateApiKeyUseCase>;
  let strategy: ApiKeyStrategy;
  let success: jest.Mock;
  let fail: jest.Mock;
  let error: jest.Mock;

  beforeEach(() => {
    validateApiKeyUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ValidateApiKeyUseCase>;
    strategy = new ApiKeyStrategy(validateApiKeyUseCase);
    success = jest.fn();
    fail = jest.fn();
    error = jest.fn();
    Object.assign(strategy, { success, fail, error });
  });

  it('fails (passing the chain) when no Authorization header is present', () => {
    strategy.authenticate(createMockRequest());
    expect(fail).toHaveBeenCalledWith(401);
    expect(success).not.toHaveBeenCalled();
    expect(validateApiKeyUseCase.execute).not.toHaveBeenCalled();
  });

  it('fails (passing the chain) when the bearer token does not carry the Ayunis API-key prefix', () => {
    strategy.authenticate(createMockRequest('Bearer eyJhbGciOiJIUzI1NiJ9.foo'));
    expect(fail).toHaveBeenCalledWith(401);
    expect(success).not.toHaveBeenCalled();
    expect(validateApiKeyUseCase.execute).not.toHaveBeenCalled();
  });

  // Authenticate dispatches an async chain via Promise; flush enough
  // microtasks for both the resolved/rejected case to propagate to the
  // synchronous side effect (success/fail/error).
  const flushPromises = () => new Promise(setImmediate);

  it('succeeds with an ActiveApiKey when the use case validates the token', async () => {
    validateApiKeyUseCase.execute.mockResolvedValue(createValidApiKey());

    strategy.authenticate(
      createMockRequest(`Bearer ${ApiKey.KEY_PREFIX}deadbeef00000000`),
    );

    await flushPromises();

    expect(validateApiKeyUseCase.execute).toHaveBeenCalledWith(
      expect.any(ValidateApiKeyCommand),
    );
    expect(success).toHaveBeenCalledTimes(1);
    const principal = success.mock.calls[0][0];
    expect(principal.kind).toBe('apiKey');
    expect(principal.apiKeyId).toBe(KEY_ID);
    expect(principal.orgId).toBe(ORG_ID);
  });

  it('fails with a 401 challenge when the use case rejects the token as invalid', async () => {
    validateApiKeyUseCase.execute.mockRejectedValue(new ApiKeyInvalidError());

    strategy.authenticate(
      createMockRequest(`Bearer ${ApiKey.KEY_PREFIX}deadbeef00000000`),
    );

    await flushPromises();

    expect(fail).toHaveBeenCalledWith(expect.any(String), 401);
    expect(success).not.toHaveBeenCalled();
  });

  it('surfaces an internal error when validation fails for non-domain reasons', async () => {
    validateApiKeyUseCase.execute.mockRejectedValue(
      new Error('database is unreachable'),
    );

    strategy.authenticate(
      createMockRequest(`Bearer ${ApiKey.KEY_PREFIX}deadbeef00000000`),
    );

    await flushPromises();

    expect(error).toHaveBeenCalledTimes(1);
    expect(success).not.toHaveBeenCalled();
    expect(fail).not.toHaveBeenCalled();
  });
});
