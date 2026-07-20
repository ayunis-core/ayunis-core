import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ListApiKeysByOrgUseCase } from './list-api-keys-by-org.use-case';
import { ApiKeysRepository } from '../../ports/api-keys.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import { UnexpectedApiKeyError } from '../../api-keys.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('ListApiKeysByOrgUseCase', () => {
  let useCase: ListApiKeysByOrgUseCase;
  let apiKeysRepository: jest.Mocked<ApiKeysRepository>;
  let contextService: jest.Mocked<Pick<ContextService, 'get'>>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListApiKeysByOrgUseCase,
        { provide: ApiKeysRepository, useValue: mockApiKeysRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(ListApiKeysByOrgUseCase);
    apiKeysRepository = module.get(ApiKeysRepository);
    contextService = module.get(ContextService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  it('returns api keys for the caller org, including revoked ones', async () => {
    const active = new ApiKey({
      name: 'active',
      prefix: 'abcabcabcabc',
      hash: 'h',
      orgId,
      createdByUserId: userId,
    });
    const revoked = new ApiKey({
      name: 'revoked',
      prefix: 'defdefdefdef',
      hash: 'h',
      orgId,
      createdByUserId: userId,
      revokedAt: new Date('2026-05-01T10:00:00Z'),
    });
    apiKeysRepository.findByOrgId.mockResolvedValue([active, revoked]);

    const result = await useCase.execute();

    expect(apiKeysRepository.findByOrgId).toHaveBeenCalledWith(orgId);
    expect(result).toEqual([active, revoked]);
    expect(result[1].revokedAt).not.toBeNull();
  });

  it('throws UnauthorizedAccessError when orgId is missing from context', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(useCase.execute()).rejects.toThrow(UnauthorizedAccessError);
    expect(apiKeysRepository.findByOrgId).not.toHaveBeenCalled();
  });

  it('wraps unexpected repository errors in UnexpectedApiKeyError', async () => {
    apiKeysRepository.findByOrgId.mockRejectedValue(new Error('db down'));

    await expect(useCase.execute()).rejects.toThrow(UnexpectedApiKeyError);
  });
});
