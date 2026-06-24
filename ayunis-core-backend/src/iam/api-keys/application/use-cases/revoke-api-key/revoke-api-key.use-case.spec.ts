import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { RevokeApiKeyUseCase } from './revoke-api-key.use-case';
import { RevokeApiKeyCommand } from './revoke-api-key.command';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { ApiKey } from '../../../domain/api-key.entity';
import { ApiKeyNotFoundError } from '../../api-keys.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('RevokeApiKeyUseCase', () => {
  let useCase: RevokeApiKeyUseCase;
  let apiKeysRepository: jest.Mocked<ApiKeysRepository>;
  let contextService: jest.Mocked<Pick<ContextService, 'get'>>;
  let warnSpy: jest.SpyInstance;

  const orgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const otherOrgId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const apiKeyId = '123e4567-e89b-12d3-a456-426614174042' as UUID;

  beforeEach(async () => {
    const contextValues: Record<string, unknown> = { orgId, userId };

    const mockApiKeysRepository = {
      findById: jest.fn(),
      findByOrgId: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined),
    };

    const mockContextService = {
      get: jest.fn((key?: PropertyKey) =>
        typeof key === 'string' ? contextValues[key] : undefined,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevokeApiKeyUseCase,
        { provide: ApiKeysRepository, useValue: mockApiKeysRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(RevokeApiKeyUseCase);
    apiKeysRepository = module.get(ApiKeysRepository);
    contextService = module.get(ContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  function buildKey(overrides: Partial<{ orgId: UUID }> = {}): ApiKey {
    return new ApiKey({
      id: apiKeyId,
      name: 'CI bot',
      prefix: 'abcabcabcabc',
      hash: 'h',
      orgId: overrides.orgId ?? orgId,
      createdByUserId: userId,
    });
  }

  it('soft-deletes the key when it belongs to the caller org', async () => {
    apiKeysRepository.findById.mockResolvedValue(buildKey());

    await useCase.execute(new RevokeApiKeyCommand(apiKeyId));

    expect(apiKeysRepository.revoke).toHaveBeenCalledWith(apiKeyId);
  });

  it('surfaces 404 (ApiKeyNotFoundError) for a truly missing key', async () => {
    apiKeysRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(new RevokeApiKeyCommand(apiKeyId)),
    ).rejects.toThrow(ApiKeyNotFoundError);
    expect(apiKeysRepository.revoke).not.toHaveBeenCalled();
  });

  it('surfaces 404 (not 403) for a cross-org revoke attempt and logs the attempt', async () => {
    apiKeysRepository.findById.mockResolvedValue(
      buildKey({ orgId: otherOrgId }),
    );

    await expect(
      useCase.execute(new RevokeApiKeyCommand(apiKeyId)),
    ).rejects.toThrow(ApiKeyNotFoundError);
    expect(apiKeysRepository.revoke).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      'Cross-org API key revoke attempt',
      expect.objectContaining({
        apiKeyId,
        keyOrgId: otherOrgId,
        callerOrgId: orgId,
      }),
    );
  });

  it('throws UnauthorizedAccessError when orgId is missing from context', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(
      useCase.execute(new RevokeApiKeyCommand(apiKeyId)),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(apiKeysRepository.findById).not.toHaveBeenCalled();
  });

  it('treats a second revoke as a no-op at the repository layer (conditional UPDATE)', async () => {
    apiKeysRepository.findById.mockResolvedValue(buildKey());

    await useCase.execute(new RevokeApiKeyCommand(apiKeyId));
    await useCase.execute(new RevokeApiKeyCommand(apiKeyId));

    // The use case delegates idempotency to the conditional UPDATE in the
    // repo; the use case itself calls revoke() each time without error.
    expect(apiKeysRepository.revoke).toHaveBeenCalledTimes(2);
  });
});
