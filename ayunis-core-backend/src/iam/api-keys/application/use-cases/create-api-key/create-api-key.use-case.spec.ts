import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import type { UUID } from 'crypto';
import { CreateApiKeyUseCase } from './create-api-key.use-case';
import { CreateApiKeyCommand } from './create-api-key.command';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { HashTextUseCase } from 'src/iam/hashing/application/use-cases/hash-text/hash-text.use-case';
import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import {
  ApiKeyExpirationInPastError,
  ApiKeyInvalidInputError,
  UnexpectedApiKeyError,
} from '../../api-keys.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('CreateApiKeyUseCase', () => {
  let useCase: CreateApiKeyUseCase;
  let apiKeysRepository: jest.Mocked<ApiKeysRepository>;
  let contextService: jest.Mocked<Pick<ContextService, 'get'>>;
  let hashTextUseCase: jest.Mocked<HashTextUseCase>;

  const orgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const contextValues: Record<string, unknown> = { orgId, userId };

    const mockApiKeysRepository = {
      findById: jest.fn(),
      findByOrgId: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
    };

    const mockContextService = {
      get: jest.fn((key?: PropertyKey) =>
        typeof key === 'string' ? contextValues[key] : undefined,
      ),
    };

    const mockHashTextUseCase = {
      execute: jest.fn().mockResolvedValue('bcrypt-hash'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateApiKeyUseCase,
        { provide: ApiKeysRepository, useValue: mockApiKeysRepository },
        { provide: ContextService, useValue: mockContextService },
        { provide: HashTextUseCase, useValue: mockHashTextUseCase },
      ],
    }).compile();

    useCase = module.get(CreateApiKeyUseCase);
    apiKeysRepository = module.get(ApiKeysRepository);
    contextService = module.get(ContextService);
    hashTextUseCase = module.get(HashTextUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('returns the created api key and the plaintext secret', async () => {
    apiKeysRepository.create.mockImplementation(async (key) => key);

    const result = await useCase.execute(
      new CreateApiKeyCommand('CI bot', null),
    );

    expect(result.apiKey.name).toBe('CI bot');
    expect(result.apiKey.orgId).toBe(orgId);
    expect(result.apiKey.createdByUserId).toBe(userId);
    expect(result.apiKey.revokedAt).toBeNull();
    expect(result.secret.startsWith(ApiKey.KEY_PREFIX)).toBe(true);
    expect(hashTextUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('hashes the full secret (with prefix) before persisting', async () => {
    apiKeysRepository.create.mockImplementation(async (key) => key);

    const { secret, apiKey } = await useCase.execute(
      new CreateApiKeyCommand('CI bot', null),
    );

    const hashCommand = hashTextUseCase.execute.mock.calls[0][0];
    expect(hashCommand.plainText).toBe(secret);
    expect(apiKey.hash).toBe('bcrypt-hash');
  });

  it('derives the lookup prefix from the first LOOKUP_PREFIX_LENGTH chars of the random portion', async () => {
    apiKeysRepository.create.mockImplementation(async (key) => key);

    const { apiKey, secret } = await useCase.execute(
      new CreateApiKeyCommand('CI bot', null),
    );

    const randomPart = secret.slice(ApiKey.KEY_PREFIX.length);
    expect(apiKey.prefix).toBe(
      randomPart.slice(0, ApiKey.LOOKUP_PREFIX_LENGTH),
    );
  });

  it('trims whitespace from the name before persisting', async () => {
    apiKeysRepository.create.mockImplementation(async (key) => key);

    const { apiKey } = await useCase.execute(
      new CreateApiKeyCommand('  staging deploy bot  ', null),
    );

    expect(apiKey.name).toBe('staging deploy bot');
  });

  it('rejects an empty/whitespace-only name with ApiKeyInvalidInputError', async () => {
    await expect(
      useCase.execute(new CreateApiKeyCommand('   ', null)),
    ).rejects.toThrow(ApiKeyInvalidInputError);
    expect(apiKeysRepository.create).not.toHaveBeenCalled();
  });

  it('rejects a past expiration date with ApiKeyExpirationInPastError', async () => {
    const past = new Date(Date.now() - 60_000);

    await expect(
      useCase.execute(new CreateApiKeyCommand('CI bot', past)),
    ).rejects.toThrow(ApiKeyExpirationInPastError);
  });

  it('throws UnauthorizedAccessError when orgId is missing from context', async () => {
    contextService.get.mockImplementation((key) =>
      key === 'userId' ? userId : undefined,
    );

    await expect(
      useCase.execute(new CreateApiKeyCommand('CI bot', null)),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('retries once on a unique-prefix collision then succeeds', async () => {
    const collision = new QueryFailedError('insert', [], {
      code: '23505',
    } as unknown as Error);
    apiKeysRepository.create
      .mockRejectedValueOnce(collision)
      .mockImplementationOnce(async (key) => key);

    const { apiKey } = await useCase.execute(
      new CreateApiKeyCommand('CI bot', null),
    );

    expect(apiKey).toBeDefined();
    expect(apiKeysRepository.create).toHaveBeenCalledTimes(2);
  });

  it('wraps a non-collision repository error in UnexpectedApiKeyError', async () => {
    apiKeysRepository.create.mockRejectedValue(new Error('db down'));

    await expect(
      useCase.execute(new CreateApiKeyCommand('CI bot', null)),
    ).rejects.toThrow(UnexpectedApiKeyError);
  });
});
