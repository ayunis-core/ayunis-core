import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import {
  PermittedImageGenerationModel,
  PermittedLanguageModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import {
  ImageGenerationModelProviderNotSupportedError,
  PermittedImageGenerationModelNotFoundForOrgError,
  UnexpectedModelError,
} from '../../models.errors';
import { GetPermittedImageGenerationModelQuery } from './get-permitted-image-generation-model.query';
import { GetPermittedImageGenerationModelUseCase } from './get-permitted-image-generation-model.use-case';
import { ModelPolicyService } from '../../services/model-policy.service';

describe('GetPermittedImageGenerationModelUseCase', () => {
  const orgId = randomUUID();
  const otherOrgId = randomUUID();

  let useCase: GetPermittedImageGenerationModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let contextService: jest.Mocked<ContextService>;
  let modelPolicy: ModelPolicyService;

  const buildImagePermittedModel = (
    provider: ModelProvider = ModelProvider.AZURE,
  ): PermittedImageGenerationModel =>
    new PermittedImageGenerationModel({
      model: new ImageGenerationModel({
        name: 'gpt-image-1',
        provider,
        displayName: 'GPT Image 1',
        isArchived: false,
      }),
      orgId,
    });

  beforeEach(async () => {
    permittedModelsRepository = {
      findOneImageGeneration: jest.fn(),
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
        GetPermittedImageGenerationModelUseCase,
        ModelPolicyService,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: ContextService, useValue: contextService },
      ],
    }).compile();

    useCase = module.get(GetPermittedImageGenerationModelUseCase);
    modelPolicy = module.get(ModelPolicyService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the permitted image-generation model on the happy path', async () => {
    const permittedModel = buildImagePermittedModel();
    permittedModelsRepository.findOneImageGeneration.mockResolvedValue(
      permittedModel,
    );
    const policySpy = jest.spyOn(modelPolicy, 'assertSupported');

    const result = await useCase.execute(
      new GetPermittedImageGenerationModelQuery({ orgId }),
    );

    expect(result).toBe(permittedModel);
    expect(
      permittedModelsRepository.findOneImageGeneration,
    ).toHaveBeenCalledWith(orgId);
    expect(policySpy).toHaveBeenCalledWith(permittedModel.model);
  });

  it('allows super admins to query other organizations', async () => {
    const permittedModel = buildImagePermittedModel();
    (contextService.get as jest.Mock).mockImplementation((key?: string) => {
      if (key === 'orgId') return orgId;
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      return undefined;
    });
    permittedModelsRepository.findOneImageGeneration.mockResolvedValue(
      permittedModel,
    );

    const result = await useCase.execute(
      new GetPermittedImageGenerationModelQuery({ orgId: otherOrgId }),
    );

    expect(result).toBe(permittedModel);
    expect(
      permittedModelsRepository.findOneImageGeneration,
    ).toHaveBeenCalledWith(otherOrgId);
  });

  it('throws UnauthorizedAccessError when a non-super-admin queries another org', async () => {
    await expect(
      useCase.execute(
        new GetPermittedImageGenerationModelQuery({ orgId: otherOrgId }),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(
      permittedModelsRepository.findOneImageGeneration,
    ).not.toHaveBeenCalled();
  });

  it('throws an org-scoped not-found error when no image-generation model is permitted', async () => {
    permittedModelsRepository.findOneImageGeneration.mockResolvedValue(null);

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).rejects.toThrow(
      new PermittedImageGenerationModelNotFoundForOrgError(orgId).message,
    );
  });

  it('throws a not-found error when the repository returns a non-image-generation permitted model', async () => {
    const nonImage = new PermittedLanguageModel({
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
    permittedModelsRepository.findOneImageGeneration.mockResolvedValue(
      nonImage as unknown as PermittedImageGenerationModel,
    );

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).rejects.toThrow(PermittedImageGenerationModelNotFoundForOrgError);
  });

  it('re-raises policy failures when the permitted model uses an unsupported provider', async () => {
    permittedModelsRepository.findOneImageGeneration.mockResolvedValue(
      buildImagePermittedModel(ModelProvider.OPENAI),
    );

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).rejects.toThrow(ImageGenerationModelProviderNotSupportedError);
  });

  it('wraps unexpected repository failures in UnexpectedModelError', async () => {
    permittedModelsRepository.findOneImageGeneration.mockRejectedValue(
      new Error('db exploded'),
    );

    await expect(
      useCase.execute(new GetPermittedImageGenerationModelQuery({ orgId })),
    ).rejects.toThrow(UnexpectedModelError);
  });
});
