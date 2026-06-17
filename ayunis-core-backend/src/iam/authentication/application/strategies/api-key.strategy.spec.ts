import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApiKeyStrategy } from './api-key.strategy';
import { ValidateApiKeyUseCase } from 'src/iam/api-keys/application/use-cases/validate-api-key/validate-api-key.use-case';
import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import {
  ApiKeyExpiredError,
  ApiKeyNotFoundError,
  UnexpectedApiKeyError,
} from 'src/iam/api-keys/application/api-keys.errors';

describe('ApiKeyStrategy', () => {
  let strategy: ApiKeyStrategy;
  let validateApiKey: jest.Mocked<ValidateApiKeyUseCase>;

  const orgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const apiKeyId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const token = `${ApiKey.KEY_PREFIX}abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH`;

  beforeEach(async () => {
    const mockValidateApiKey = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyStrategy,
        { provide: ValidateApiKeyUseCase, useValue: mockValidateApiKey },
      ],
    }).compile();

    strategy = module.get(ApiKeyStrategy);
    validateApiKey = module.get(ValidateApiKeyUseCase);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  it('returns the principal on a valid token', async () => {
    validateApiKey.execute.mockResolvedValue(
      new ApiKey({
        id: apiKeyId,
        name: 'CI bot',
        prefix: 'abcdefghijkl',
        hash: 'stored-bcrypt-hash',
        orgId,
        createdByUserId: null,
        expiresAt: null,
        revokedAt: null,
      }),
    );

    await expect(strategy.validate(token)).resolves.toEqual({
      apiKeyId,
      orgId,
    });
  });

  it('returns false when the key is not found (collapsed unknown/mismatch/revoked)', async () => {
    validateApiKey.execute.mockRejectedValue(new ApiKeyNotFoundError());

    await expect(strategy.validate(token)).resolves.toBe(false);
  });

  it('returns false when the key is expired', async () => {
    validateApiKey.execute.mockRejectedValue(new ApiKeyExpiredError());

    await expect(strategy.validate(token)).resolves.toBe(false);
  });

  it('rethrows infrastructure failures so they surface as 500, not 401', async () => {
    validateApiKey.execute.mockRejectedValue(new UnexpectedApiKeyError());

    await expect(strategy.validate(token)).rejects.toThrow(
      UnexpectedApiKeyError,
    );
  });

  it('rethrows non-ApplicationError exceptions', async () => {
    validateApiKey.execute.mockRejectedValue(new Error('boom'));

    await expect(strategy.validate(token)).rejects.toThrow('boom');
  });
});
