import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { ValidateApiKeyUseCase } from './validate-api-key.use-case';
import { ValidateApiKeyCommand } from './validate-api-key.command';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { ApiKey } from '../../../domain/api-key.entity';
import { ApiKeyExpiredError, ApiKeyInvalidError } from '../../api-keys.errors';
import { CompareHashUseCase } from '../../../../hashing/application/use-cases/compare-hash/compare-hash.use-case';

describe('ValidateApiKeyUseCase', () => {
  let useCase: ValidateApiKeyUseCase;
  let mockApiKeysRepository: {
    findByPrefix: jest.Mock;
    findById: jest.Mock;
    findByOrgId: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  let mockCompareHashUseCase: { execute: jest.Mock };

  const orgId = randomUUID();
  const apiKeyId = randomUUID();

  // Build a valid-looking token: prefix + LOOKUP_PREFIX_LENGTH chars + extra
  const lookupPrefix = 'abcdefghijkl'; // 12 chars
  const validToken = `${ApiKey.KEY_PREFIX}${lookupPrefix}REST_OF_TOKEN`;

  const buildApiKey = (overrides: Partial<ApiKey> = {}): ApiKey =>
    new ApiKey({
      id: apiKeyId,
      name: 'test-key',
      prefix: lookupPrefix,
      hash: 'bcrypt-hash',
      orgId,
      createdByUserId: null,
      ...overrides,
    });

  beforeEach(async () => {
    mockApiKeysRepository = {
      findByPrefix: jest.fn(),
      findById: jest.fn(),
      findByOrgId: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };

    mockCompareHashUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateApiKeyUseCase,
        { provide: ApiKeysRepository, useValue: mockApiKeysRepository },
        { provide: CompareHashUseCase, useValue: mockCompareHashUseCase },
      ],
    }).compile();

    useCase = module.get<ValidateApiKeyUseCase>(ValidateApiKeyUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws ApiKeyInvalidError when the token has no ayk_live_ prefix', async () => {
    await expect(
      useCase.execute(new ValidateApiKeyCommand('not_an_ayk_token')),
    ).rejects.toThrow(ApiKeyInvalidError);
    expect(mockApiKeysRepository.findByPrefix).not.toHaveBeenCalled();
    expect(mockCompareHashUseCase.execute).not.toHaveBeenCalled();
  });

  it('throws ApiKeyInvalidError when the token is shorter than KEY_PREFIX + LOOKUP_PREFIX_LENGTH', async () => {
    // 11 chars after the prefix (one less than LOOKUP_PREFIX_LENGTH = 12)
    const tooShort = `${ApiKey.KEY_PREFIX}abcdefghijk`;

    await expect(
      useCase.execute(new ValidateApiKeyCommand(tooShort)),
    ).rejects.toThrow(ApiKeyInvalidError);
    expect(mockApiKeysRepository.findByPrefix).not.toHaveBeenCalled();
    expect(mockCompareHashUseCase.execute).not.toHaveBeenCalled();
  });

  it('throws ApiKeyInvalidError when the repository returns null for the prefix (and does not call bcrypt)', async () => {
    mockApiKeysRepository.findByPrefix.mockResolvedValue(null);

    await expect(
      useCase.execute(new ValidateApiKeyCommand(validToken)),
    ).rejects.toThrow(ApiKeyInvalidError);
    expect(mockApiKeysRepository.findByPrefix).toHaveBeenCalledWith(
      lookupPrefix,
    );
    expect(mockCompareHashUseCase.execute).not.toHaveBeenCalled();
  });

  it('throws ApiKeyInvalidError when the hash comparison returns false', async () => {
    mockApiKeysRepository.findByPrefix.mockResolvedValue(buildApiKey());
    mockCompareHashUseCase.execute.mockResolvedValue(false);

    await expect(
      useCase.execute(new ValidateApiKeyCommand(validToken)),
    ).rejects.toThrow(ApiKeyInvalidError);
    expect(mockCompareHashUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('throws ApiKeyExpiredError carrying the apiKeyId when the key is past expiration', async () => {
    const past = new Date(Date.now() - 60_000);
    mockApiKeysRepository.findByPrefix.mockResolvedValue(
      buildApiKey({ expiresAt: past }),
    );
    mockCompareHashUseCase.execute.mockResolvedValue(true);

    let caught: unknown;
    try {
      await useCase.execute(new ValidateApiKeyCommand(validToken));
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ApiKeyExpiredError);
    expect((caught as ApiKeyExpiredError).metadata).toEqual(
      expect.objectContaining({ apiKeyId }),
    );
  });

  it('returns the api key when hash matches and there is no expiration', async () => {
    const key = buildApiKey({ expiresAt: null });
    mockApiKeysRepository.findByPrefix.mockResolvedValue(key);
    mockCompareHashUseCase.execute.mockResolvedValue(true);

    const result = await useCase.execute(new ValidateApiKeyCommand(validToken));

    expect(result).toBe(key);
  });

  it('returns the api key when hash matches and expiresAt is in the future', async () => {
    const future = new Date(Date.now() + 60_000);
    const key = buildApiKey({ expiresAt: future });
    mockApiKeysRepository.findByPrefix.mockResolvedValue(key);
    mockCompareHashUseCase.execute.mockResolvedValue(true);

    const result = await useCase.execute(new ValidateApiKeyCommand(validToken));

    expect(result).toBe(key);
  });
});
