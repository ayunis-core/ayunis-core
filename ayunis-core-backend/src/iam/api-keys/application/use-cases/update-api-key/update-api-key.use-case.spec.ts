import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { ApiKeysRepository } from 'src/iam/api-keys/application/ports/api-keys.repository';
import {
  ApiKeyExpirationInPastError,
  ApiKeyInvalidInputError,
  ApiKeyNotEditableError,
  ApiKeyNotFoundError,
  UnexpectedApiKeyError,
} from 'src/iam/api-keys/application/api-keys.errors';
import { ApiKey } from 'src/iam/api-keys/domain/api-key.entity';
import { UpdateApiKeyCommand } from './update-api-key.command';
import { UpdateApiKeyUseCase } from './update-api-key.use-case';

describe('UpdateApiKeyUseCase', () => {
  let useCase: UpdateApiKeyUseCase;
  let apiKeysRepository: jest.Mocked<ApiKeysRepository>;

  const orgId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const otherOrgId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
  const apiKeyId = '123e4567-e89b-12d3-a456-426614174042' as UUID;

  function buildKey(overrides: Partial<{ orgId: UUID; name: string }> = {}) {
    return new ApiKey({
      id: apiKeyId,
      name: overrides.name ?? 'Citizen portal',
      prefix: 'abcabcabcabc',
      hash: 'h',
      orgId: overrides.orgId ?? orgId,
      createdByUserId: null,
    });
  }

  beforeEach(async () => {
    const mockApiKeysRepository = {
      findById: jest.fn().mockResolvedValue(buildKey()),
      findByOrgId: jest.fn(),
      findByPrefix: jest.fn(),
      create: jest.fn(),
      revoke: jest.fn(),
      updateMetadataIfActive: jest.fn().mockResolvedValue(true),
    };
    const mockContextService = {
      get: jest.fn((key?: PropertyKey) =>
        key === 'orgId' ? orgId : undefined,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateApiKeyUseCase,
        { provide: ApiKeysRepository, useValue: mockApiKeysRepository },
        { provide: ContextService, useValue: mockContextService },
      ],
    }).compile();

    useCase = module.get(UpdateApiKeyUseCase);
    apiKeysRepository = module.get(ApiKeysRepository);
  });

  it('trims the name and description and scopes the update to the org', async () => {
    await useCase.execute(
      new UpdateApiKeyCommand(apiKeyId, {
        name: '  Citizen portal v2 ',
        description: ' OptiGov connector ',
      }),
    );

    expect(apiKeysRepository.updateMetadataIfActive).toHaveBeenCalledWith(
      apiKeyId,
      orgId,
      { name: 'Citizen portal v2', description: 'OptiGov connector' },
    );
  });

  it('leaves omitted fields untouched', async () => {
    await useCase.execute(
      new UpdateApiKeyCommand(apiKeyId, { description: 'Only this' }),
    );

    expect(apiKeysRepository.updateMetadataIfActive).toHaveBeenCalledWith(
      apiKeyId,
      orgId,
      { description: 'Only this' },
    );
  });

  it.each([null, '', '   '])(
    'clears the description when it is %p',
    async (description) => {
      await useCase.execute(new UpdateApiKeyCommand(apiKeyId, { description }));

      expect(apiKeysRepository.updateMetadataIfActive).toHaveBeenCalledWith(
        apiKeyId,
        orgId,
        { description: null },
      );
    },
  );

  it('sets a future expiry date', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await useCase.execute(new UpdateApiKeyCommand(apiKeyId, { expiresAt }));

    expect(apiKeysRepository.updateMetadataIfActive).toHaveBeenCalledWith(
      apiKeyId,
      orgId,
      { expiresAt },
    );
  });

  it('removes the expiry date when null is given', async () => {
    await useCase.execute(
      new UpdateApiKeyCommand(apiKeyId, { expiresAt: null }),
    );

    expect(apiKeysRepository.updateMetadataIfActive).toHaveBeenCalledWith(
      apiKeyId,
      orgId,
      { expiresAt: null },
    );
  });

  it('rejects an expiry date that is not in the future', async () => {
    await expect(
      useCase.execute(
        new UpdateApiKeyCommand(apiKeyId, {
          expiresAt: new Date(Date.now() - 1000),
        }),
      ),
    ).rejects.toBeInstanceOf(ApiKeyExpirationInPastError);
    expect(apiKeysRepository.updateMetadataIfActive).not.toHaveBeenCalled();
  });

  it('returns the key as stored after the update', async () => {
    const stored = buildKey({ name: 'Renamed' });
    apiKeysRepository.findById.mockResolvedValue(stored);

    const result = await useCase.execute(
      new UpdateApiKeyCommand(apiKeyId, { name: 'Renamed' }),
    );

    expect(result).toBe(stored);
  });

  it('rejects a blank name without touching the key', async () => {
    await expect(
      useCase.execute(new UpdateApiKeyCommand(apiKeyId, { name: '   ' })),
    ).rejects.toBeInstanceOf(ApiKeyInvalidInputError);
    expect(apiKeysRepository.updateMetadataIfActive).not.toHaveBeenCalled();
  });

  it('rejects an update without changes', async () => {
    await expect(
      useCase.execute(new UpdateApiKeyCommand(apiKeyId, {})),
    ).rejects.toBeInstanceOf(ApiKeyInvalidInputError);
  });

  it('reports a revoked or expired key of the own org as not editable', async () => {
    apiKeysRepository.updateMetadataIfActive.mockResolvedValue(false);

    await expect(
      useCase.execute(new UpdateApiKeyCommand(apiKeyId, { name: 'X' })),
    ).rejects.toBeInstanceOf(ApiKeyNotEditableError);
  });

  it('reports a key of another org as not found', async () => {
    apiKeysRepository.updateMetadataIfActive.mockResolvedValue(false);
    apiKeysRepository.findById.mockResolvedValue(
      buildKey({ orgId: otherOrgId }),
    );

    await expect(
      useCase.execute(new UpdateApiKeyCommand(apiKeyId, { name: 'X' })),
    ).rejects.toBeInstanceOf(ApiKeyNotFoundError);
  });

  it('reports a missing key as not found', async () => {
    apiKeysRepository.updateMetadataIfActive.mockResolvedValue(false);
    apiKeysRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(new UpdateApiKeyCommand(apiKeyId, { name: 'X' })),
    ).rejects.toBeInstanceOf(ApiKeyNotFoundError);
  });

  it('wraps unexpected repository failures', async () => {
    apiKeysRepository.updateMetadataIfActive.mockRejectedValue(
      new Error('connection lost'),
    );

    await expect(
      useCase.execute(new UpdateApiKeyCommand(apiKeyId, { name: 'X' })),
    ).rejects.toBeInstanceOf(UnexpectedApiKeyError);
  });
});
