import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  PermittedEmbeddingModel,
  PermittedLanguageModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';
import {
  PermittedEmbeddingModelNotFoundForOrgError,
  UnexpectedModelError,
} from '../../models.errors';
import { GetPermittedEmbeddingModelQuery } from './get-permitted-embedding-model.query';
import { GetPermittedEmbeddingModelUseCase } from './get-permitted-embedding-model.use-case';

describe('GetPermittedEmbeddingModelUseCase', () => {
  const orgId = randomUUID();
  const otherOrgId = randomUUID();

  let useCase: GetPermittedEmbeddingModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let contextService: jest.Mocked<ContextService>;

  const buildEmbeddingPermittedModel = (): PermittedEmbeddingModel =>
    new PermittedEmbeddingModel({
      model: new EmbeddingModel({
        name: 'text-embedding-3-small',
        provider: ModelProvider.OPENAI,
        displayName: 'Text Embedding 3 Small',
        dimensions: EmbeddingDimensions.DIMENSION_1536,
        isArchived: false,
      }),
      orgId,
    });

  beforeEach(async () => {
    permittedModelsRepository = {
      findOneEmbedding: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelsRepository>;

    contextService = {
      get: jest.fn((key: string) => {
        if (key === 'orgId') return orgId;
        if (key === 'systemRole') return SystemRole.CUSTOMER;
        return undefined;
      }),
    } as unknown as jest.Mocked<ContextService>;

    const module = await Test.createTestingModule({
      providers: [
        GetPermittedEmbeddingModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(GetPermittedEmbeddingModelUseCase);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the permitted embedding model on the happy path', async () => {
    const permittedModel = buildEmbeddingPermittedModel();
    permittedModelsRepository.findOneEmbedding.mockResolvedValue(
      permittedModel,
    );

    const result = await useCase.execute(
      new GetPermittedEmbeddingModelQuery({ orgId }),
    );

    expect(result).toBe(permittedModel);
    expect(permittedModelsRepository.findOneEmbedding).toHaveBeenCalledWith(
      orgId,
    );
  });

  it('allows super admins to query other organizations', async () => {
    const permittedModel = buildEmbeddingPermittedModel();
    (contextService.get as jest.Mock).mockImplementation((key?: string) => {
      if (key === 'orgId') return orgId;
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      return undefined;
    });
    permittedModelsRepository.findOneEmbedding.mockResolvedValue(
      permittedModel,
    );

    const result = await useCase.execute(
      new GetPermittedEmbeddingModelQuery({ orgId: otherOrgId }),
    );

    expect(result).toBe(permittedModel);
    expect(permittedModelsRepository.findOneEmbedding).toHaveBeenCalledWith(
      otherOrgId,
    );
  });

  it('throws UnauthorizedAccessError when a non-super-admin queries another org', async () => {
    await expect(
      useCase.execute(
        new GetPermittedEmbeddingModelQuery({ orgId: otherOrgId }),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(permittedModelsRepository.findOneEmbedding).not.toHaveBeenCalled();
  });

  it('throws an org-scoped not-found error when no embedding model is permitted', async () => {
    permittedModelsRepository.findOneEmbedding.mockResolvedValue(null);

    await expect(
      useCase.execute(new GetPermittedEmbeddingModelQuery({ orgId })),
    ).rejects.toThrow(
      new PermittedEmbeddingModelNotFoundForOrgError(orgId).message,
    );
  });

  it('throws a not-found error when the repository returns a non-embedding permitted model', async () => {
    const nonEmbedding = new PermittedLanguageModel({
      model: new LanguageModel({
        name: 'gpt-4',
        provider: ModelProvider.OPENAI,
        displayName: 'GPT-4',
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        canVision: false,
        isArchived: false,
      }),
      orgId,
    });
    permittedModelsRepository.findOneEmbedding.mockResolvedValue(
      nonEmbedding as unknown as PermittedEmbeddingModel,
    );

    await expect(
      useCase.execute(new GetPermittedEmbeddingModelQuery({ orgId })),
    ).rejects.toThrow(PermittedEmbeddingModelNotFoundForOrgError);
  });

  it('wraps unexpected repository failures in UnexpectedModelError', async () => {
    permittedModelsRepository.findOneEmbedding.mockRejectedValue(
      new Error('db exploded'),
    );

    await expect(
      useCase.execute(new GetPermittedEmbeddingModelQuery({ orgId })),
    ).rejects.toThrow(UnexpectedModelError);
  });
});
