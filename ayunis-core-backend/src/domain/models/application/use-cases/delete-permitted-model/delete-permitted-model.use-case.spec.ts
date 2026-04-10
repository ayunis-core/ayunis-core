// Mock the Transactional decorator
jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyName: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { DeletePermittedModelUseCase } from './delete-permitted-model.use-case';
import { DeletePermittedModelCommand } from './delete-permitted-model.command';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { DeleteUserDefaultModelsByModelIdUseCase } from '../delete-user-default-models-by-model-id/delete-user-default-models-by-model-id.use-case';
import { GetPermittedModelsUseCase } from '../get-permitted-models/get-permitted-models.use-case';
import { ReplaceModelWithUserDefaultUseCase } from 'src/domain/threads/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { ReplaceModelWithUserDefaultUseCase as ReplaceModelWithUserDefaultUseCaseAgents } from 'src/domain/agents/application/use-cases/replace-model-with-user-default/replace-model-with-user-default.use-case';
import { FindAllThreadsByOrgWithSourcesUseCase } from 'src/domain/threads/application/use-cases/find-all-threads-by-org-with-sources/find-all-threads-by-org-with-sources.use-case';
import { DeleteSourcesUseCase } from 'src/domain/sources/application/use-cases/delete-sources/delete-sources.use-case';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';

describe('DeletePermittedModelUseCase', () => {
  let useCase: DeletePermittedModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let getPermittedModelsUseCase: jest.Mocked<GetPermittedModelsUseCase>;

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
            deleteTeamScopedByOrgAndModelId: jest.fn(),
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
          provide: ReplaceModelWithUserDefaultUseCaseAgents,
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

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('cascade delete team-scoped models', () => {
    it('should delete team-scoped permitted models when deleting an org-scoped language model', async () => {
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
      permittedModelsRepository.deleteTeamScopedByOrgAndModelId.mockResolvedValue();
      permittedModelsRepository.delete.mockResolvedValue();

      const command = new DeletePermittedModelCommand({
        orgId: mockOrgId,
        permittedModelId: mockPermittedModelId,
      });

      await useCase.execute(command);

      expect(
        permittedModelsRepository.deleteTeamScopedByOrgAndModelId,
      ).toHaveBeenCalledWith(mockOrgId, mockCatalogModelId);

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
      expect(
        permittedModelsRepository.deleteTeamScopedByOrgAndModelId,
      ).not.toHaveBeenCalled();
    });

    it('should call team cascade before deleting the org model', async () => {
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
      permittedModelsRepository.deleteTeamScopedByOrgAndModelId.mockResolvedValue();
      permittedModelsRepository.delete.mockResolvedValue();

      const command = new DeletePermittedModelCommand({
        orgId: mockOrgId,
        permittedModelId: mockPermittedModelId,
      });

      await useCase.execute(command);

      // Verify cascade happens before the org model is deleted
      const cascadeCall =
        permittedModelsRepository.deleteTeamScopedByOrgAndModelId.mock
          .invocationCallOrder[0];
      const deleteCall =
        permittedModelsRepository.delete.mock.invocationCallOrder[0];
      expect(cascadeCall).toBeLessThan(deleteCall);
    });
  });
});
