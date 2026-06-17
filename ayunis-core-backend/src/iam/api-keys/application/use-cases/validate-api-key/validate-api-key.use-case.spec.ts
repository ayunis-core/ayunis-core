import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ValidateApiKeyUseCase } from './validate-api-key.use-case';
import { ValidateApiKeyCommand } from './validate-api-key.command';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { CompareHashUseCase } from 'src/iam/hashing/application/use-cases/compare-hash/compare-hash.use-case';
import { ApiKey } from '../../../domain/api-key.entity';
import { ApiKeyExpiredError, ApiKeyNotFoundError } from '../../api-keys.errors';

describe('ValidateApiKeyUseCase', () => {
  let useCase: ValidateApiKeyUseCase;
  let apiKeysRepository: jest.Mocked<ApiKeysRepository>;
  let compareHashUseCase: jest.Mocked<CompareHashUseCase>;

  const orgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const apiKeyId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const validRandomPart = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKL';
  const validToken = `${ApiKey.KEY_PREFIX}${validRandomPart}`;
  const validPrefix = validRandomPart.slice(0, ApiKey.LOOKUP_PREFIX_LENGTH);

  const buildApiKey = (overrides: Partial<ApiKey> = {}): ApiKey =>
    new ApiKey({
      id: apiKeyId,
      name: 'CI bot',
      prefix: validPrefix,
      hash: 'stored-bcrypt-hash',
      orgId,
      createdByUserId: null,
      expiresAt: null,
      revokedAt: null,
      ...overrides,
    });

  beforeEach(async () => {
    const mockApiKeysRepository = {
      findById: jest.fn(),
      findByOrgId: jest.fn(),
      findByPrefix: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
    };

    const mockCompareHashUseCase = {
      execute: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateApiKeyUseCase,
        { provide: ApiKeysRepository, useValue: mockApiKeysRepository },
        { provide: CompareHashUseCase, useValue: mockCompareHashUseCase },
      ],
    }).compile();

    useCase = module.get(ValidateApiKeyUseCase);
    apiKeysRepository = module.get(ApiKeysRepository);
    compareHashUseCase = module.get(CompareHashUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('returns the api key on a valid, active, unexpired token', async () => {
    const apiKey = buildApiKey();
    apiKeysRepository.findByPrefix.mockResolvedValue(apiKey);

    const result = await useCase.execute(new ValidateApiKeyCommand(validToken));

    expect(result).toBe(apiKey);
    expect(apiKeysRepository.findByPrefix).toHaveBeenCalledWith(validPrefix);
    expect(compareHashUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ plainText: validToken, hash: apiKey.hash }),
    );
  });

  it('rejects a token with no matching prefix as ApiKeyNotFoundError', async () => {
    apiKeysRepository.findByPrefix.mockResolvedValue(null);

    await expect(
      useCase.execute(new ValidateApiKeyCommand(validToken)),
    ).rejects.toThrow(ApiKeyNotFoundError);
    expect(compareHashUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects a token whose hash does not match as ApiKeyNotFoundError (same as unknown prefix)', async () => {
    apiKeysRepository.findByPrefix.mockResolvedValue(buildApiKey());
    compareHashUseCase.execute.mockResolvedValue(false);

    await expect(
      useCase.execute(new ValidateApiKeyCommand(validToken)),
    ).rejects.toThrow(ApiKeyNotFoundError);
  });

  it('rejects a revoked key as ApiKeyNotFoundError', async () => {
    apiKeysRepository.findByPrefix.mockResolvedValue(
      buildApiKey({ revokedAt: new Date('2026-01-01T00:00:00Z') }),
    );

    await expect(
      useCase.execute(new ValidateApiKeyCommand(validToken)),
    ).rejects.toThrow(ApiKeyNotFoundError);
  });

  it('rejects an expired key as ApiKeyExpiredError', async () => {
    apiKeysRepository.findByPrefix.mockResolvedValue(
      buildApiKey({ expiresAt: new Date(Date.now() - 60_000) }),
    );

    await expect(
      useCase.execute(new ValidateApiKeyCommand(validToken)),
    ).rejects.toThrow(ApiKeyExpiredError);
  });

  it('rejects a token that does not start with KEY_PREFIX without touching the repository', async () => {
    await expect(
      useCase.execute(new ValidateApiKeyCommand('not-an-ayunis-key')),
    ).rejects.toThrow(ApiKeyNotFoundError);
    expect(apiKeysRepository.findByPrefix).not.toHaveBeenCalled();
  });

  it('does not leak apiKeyId in the public payload of ApiKeyNotFoundError', () => {
    const error = new ApiKeyNotFoundError();
    const httpException = error.toHttpException();
    expect(JSON.stringify(httpException.getResponse())).not.toContain(
      'apiKeyId',
    );
  });

  it('does not leak apiKeyId in the public payload of ApiKeyExpiredError', () => {
    const error = new ApiKeyExpiredError();
    const httpException = error.toHttpException();
    expect(JSON.stringify(httpException.getResponse())).not.toContain(
      'apiKeyId',
    );
  });
});
