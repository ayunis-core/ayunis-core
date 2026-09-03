import { createLoggerMock } from 'src/common/testing/logger.mock';
// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { DeletePermittedModelUseCase } from './delete-permitted-model.use-case';
import { DeletePermittedModelCommand } from './delete-permitted-model.command';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import {
  PermittedEmbeddingModel,
  PermittedImageGenerationModel,
  PermittedLanguageModel,
} from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { EmbeddingModel } from 'src/domain/models/domain/models/embedding.model';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { DeleteUserDefaultModelsByModelIdUseCase } from 'src/domain/models/application/use-cases/delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.use-case';
import { GetPermittedModelsUseCase } from 'src/domain/models/application/use-cases/get-permitted-models/get-permitted-models.use-case';
import { ReplaceModelWithUserDefaultUseCase } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { FindAllThreadsByOrgWithSourcesUseCase } from 'src/domain/threads/application/use-cases/find-all-threads-by-org-with-sources/find-all-threads-by-org-with-sources.use-case';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { EmbeddingDimensions } from 'src/domain/models/domain/value-objects/embedding-dimensions.enum';

describe('DeletePermittedModelUseCase', () => {
  const logger = createLoggerMock();
  let useCase: DeletePermittedModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let getPermittedModelsUseCase: jest.Mocked<GetPermittedModelsUseCase>;
  let findAllThreadsByOrgWithSourcesUseCase: jest.Mocked<FindAllThreadsByOrgWithSourcesUseCase>;
  let deleteSourcesUseCase: jest.Mocked<DeleteSourcesUseCase>;
  let contextService: jest.Mocked<ContextService>;

  const mockOrgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const mockModelId = '123e4567-e89b-12d3-a456-426614174001' as UUID;
  const mockPermittedModelId = '123e4567-e89b-12d3-a456-426614174002' as UUID;
  const mockCatalogModelId = '123e4567-e89b-12d3-a456-426614174003' as UUID;

  const mockLanguageModel = new LanguageModel({
    id: mockCatalogModelId,
    name: 'gpt-4',
    displayName: 'GPT-4',
    provider: ModelProvider.OPENAI,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: false,
  });

  const mockLanguageModel2 = new LanguageModel({
    id: mockModelId,
    name: 'claude-3',
    displayName: 'Claude 3',
    provider: ModelProvider.ANTHROPIC,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: false,
  });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeletePermittedModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: DeleteUserDefaultModelsByModelIdUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetPermittedModelsUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ReplaceModelWithUserDefaultUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: FindAllThreadsByOrgWithSourcesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: DeleteSourcesUseCase,
          useValue: { execute: jest.fn() },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'orgId') return mockOrgId;
              if (key === 'role') return UserRole.ADMIN;
              if (key === 'systemRole') return null;
              return null;
            }),
          },
        },
      ],
    }).compile();

    useCase = module.get(DeletePermittedModelUseCase);
    permittedModelsRepository = module.get(PermittedModelsRepository);
    getPermittedModelsUseCase = module.get(GetPermittedModelsUseCase);
    findAllThreadsByOrgWithSourcesUseCase = module.get(
      FindAllThreadsByOrgWithSourcesUseCase,
    );
    deleteSourcesUseCase = module.get(DeleteSourcesUseCase);
    contextService = module.get(ContextService);

    logger.log.mockImplementation();
    logger.debug.mockImplementation();
    logger.error.mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses the target org when deleting sources as a cross-org super admin', async () => {
    const adminOrgId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
    const sourceId = '123e4567-e89b-12d3-a456-426614174098' as UUID;
    const embeddingModel = new PermittedEmbeddingModel({
      id: mockPermittedModelId,
      model: new EmbeddingModel({
        id: mockCatalogModelId,
        name: 'text-embedding-3-small',
        displayName: 'Text Embedding 3 Small',
        provider: ModelProvider.OPENAI,
        dimensions: EmbeddingDimensions.DIMENSION_1536,
        isArchived: false,
      }),
      orgId: mockOrgId,
      scope: PermittedModelScope.ORG,
    });
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return adminOrgId;
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      return null;
    });
    permittedModelsRepository.findOne.mockResolvedValue(embeddingModel);
    findAllThreadsByOrgWithSourcesUseCase.execute.mockResolvedValue([
      { sourceAssignments: [{ source: { id: sourceId } }] },
    ] as never);

    await useCase.execute(
      new DeletePermittedModelCommand({
        orgId: mockOrgId,
        permittedModelId: mockPermittedModelId,
      }),
    );

    expect(deleteSourcesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIds: [sourceId],
        orgId: mockOrgId,
      }),
    );
  });

  describe('independent team-scoped grants', () => {
    it('preserves matching team grants when deleting an org-scoped language grant', async () => {
      const orgPermittedModel = new PermittedLanguageModel({
        id: mockPermittedModelId,
        model: mockLanguageModel,
        orgId: mockOrgId,
        isDefault: false,
        scope: PermittedModelScope.ORG,
      });

      const anotherOrgModel = new PermittedLanguageModel({
        id: mockModelId,
        model: mockLanguageModel2,
        orgId: mockOrgId,
        isDefault: false,
        scope: PermittedModelScope.ORG,
      });

      permittedModelsRepository.findOne.mockResolvedValue(orgPermittedModel);
      getPermittedModelsUseCase.execute.mockResolvedValue([
        orgPermittedModel,
        anotherOrgModel,
      ]);
      permittedModelsRepository.delete.mockResolvedValue();

      const command = new DeletePermittedModelCommand({
        orgId: mockOrgId,
        permittedModelId: mockPermittedModelId,
      });

      await useCase.execute(command);

      expect(permittedModelsRepository.delete).toHaveBeenCalledWith({
        id: mockPermittedModelId,
        orgId: mockOrgId,
      });
    });

    it('should throw UnauthorizedAccessError when the model belongs to a different org', async () => {
      const otherOrgId = '123e4567-e89b-12d3-a456-426614174099' as UUID;
      const modelFromOtherOrg = new PermittedLanguageModel({
        id: mockPermittedModelId,
        model: mockLanguageModel,
        orgId: otherOrgId,
        isDefault: false,
        scope: PermittedModelScope.ORG,
      });

      permittedModelsRepository.findOne.mockResolvedValue(modelFromOtherOrg);

      const command = new DeletePermittedModelCommand({
        orgId: mockOrgId,
        permittedModelId: mockPermittedModelId,
      });

      await expect(useCase.execute(command)).rejects.toBeInstanceOf(
        UnauthorizedAccessError,
      );

      expect(permittedModelsRepository.delete).not.toHaveBeenCalled();
    });

    it('preserves matching team grants when deleting an org-scoped image-generation grant', async () => {
      const mockImageModel = new ImageGenerationModel({
        id: mockCatalogModelId,
        name: 'dall-e-3',
        displayName: 'DALL-E 3',
        provider: ModelProvider.OPENAI,
        isArchived: false,
      });

      const orgPermittedImageModel = new PermittedImageGenerationModel({
        id: mockPermittedModelId,
        model: mockImageModel,
        orgId: mockOrgId,
        scope: PermittedModelScope.ORG,
      });

      permittedModelsRepository.findOne.mockResolvedValue(
        orgPermittedImageModel,
      );
      permittedModelsRepository.delete.mockResolvedValue();

      const command = new DeletePermittedModelCommand({
        orgId: mockOrgId,
        permittedModelId: mockPermittedModelId,
      });

      await useCase.execute(command);

      expect(permittedModelsRepository.delete).toHaveBeenCalledWith({
        id: mockPermittedModelId,
        orgId: mockOrgId,
      });
    });
  });
});
