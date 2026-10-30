import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { SetOrgDefaultLanguageModelUseCase } from './set-org-default-language-model.use-case';
import { SetOrgDefaultLanguageModelCommand } from './set-org-default-language-model.command';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { ContextService } from 'src/common/context/services/context.service';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelNotFoundError } from 'src/domain/models/application/models.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { UUID } from 'crypto';

const selectionsRepository = { setModel: jest.fn() };

describe('SetOrgDefaultLanguageModelUseCase', () => {
  afterEach(() => jest.clearAllMocks());

  let useCase: SetOrgDefaultLanguageModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let contextService: jest.Mocked<ContextService>;

  const orgId = '123e4567-e89b-12d3-a456-426614174000' as UUID;
  const permittedModelId = '123e4567-e89b-12d3-a456-426614174001' as UUID;

  beforeEach(async () => {
    permittedModelsRepository = {
      findOne: jest.fn(),
      findOneLanguage: jest.fn(),
    } as unknown as jest.Mocked<PermittedModelsRepository>;

    contextService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ContextService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetOrgDefaultLanguageModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: permittedModelsRepository,
        },
        { provide: ContextService, useValue: contextService },
        {
          provide: DefaultModelSelectionsRepository,
          useValue: selectionsRepository,
        },
      ],
    }).compile();

    useCase = module.get(SetOrgDefaultLanguageModelUseCase);
  });

  function setAdminContext(): void {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });
  }

  it('sets a language permitted model as the org default', async () => {
    setAdminContext();
    const permittedLanguageModel = new PermittedLanguageModel({
      id: permittedModelId,
      orgId,
      isDefault: false,
      model: new LanguageModel({
        id: '123e4567-e89b-12d3-a456-426614174002',
        name: 'gpt-4o',
        displayName: 'GPT-4o',
        provider: ModelProvider.OPENAI,
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        canVision: true,
        contextWindowSize: 128_000,
        isArchived: false,
      }),
    });

    permittedModelsRepository.findOneLanguage.mockResolvedValue(
      permittedLanguageModel,
    );

    const result = await useCase.execute(
      new SetOrgDefaultLanguageModelCommand(permittedModelId, orgId),
    );

    expect(permittedModelsRepository.findOneLanguage).toHaveBeenCalledWith({
      id: permittedModelId,
      orgId,
    });
    expect(selectionsRepository.setModel).toHaveBeenCalledWith(
      { orgId },
      permittedModelId,
    );
    expect(result.isDefault).toBe(true);
  });

  it('rejects non-language permitted model ids for org-default flows', async () => {
    setAdminContext();
    permittedModelsRepository.findOneLanguage.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new SetOrgDefaultLanguageModelCommand(permittedModelId, orgId),
      ),
    ).rejects.toThrow(PermittedModelNotFoundError);

    expect(selectionsRepository.setModel).not.toHaveBeenCalled();
  });

  it('rejects users outside the target org unless they are super admins', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return '123e4567-e89b-12d3-a456-426614174099';
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    await expect(
      useCase.execute(
        new SetOrgDefaultLanguageModelCommand(permittedModelId, orgId),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);

    expect(permittedModelsRepository.findOneLanguage).not.toHaveBeenCalled();
  });

  const languagePermit = (params: {
    scope: PermittedModelScope;
    isArchived: boolean;
  }) =>
    new PermittedLanguageModel({
      id: permittedModelId,
      orgId,
      scope: params.scope,
      scopeId:
        params.scope === PermittedModelScope.TEAM
          ? '123e4567-e89b-12d3-a456-426614174055'
          : null,
      model: new LanguageModel({
        name: 'gpt-4o',
        displayName: 'GPT-4o',
        provider: ModelProvider.OPENAI,
        canStream: true,
        canUseTools: true,
        isReasoning: false,
        canVision: true,
        contextWindowSize: 128_000,
        isArchived: params.isArchived,
      }),
    });

  it('rejects a team-scoped permit as the org default', async () => {
    setAdminContext();
    permittedModelsRepository.findOneLanguage.mockResolvedValue(
      languagePermit({ scope: PermittedModelScope.TEAM, isArchived: false }),
    );

    await expect(
      useCase.execute(
        new SetOrgDefaultLanguageModelCommand(permittedModelId, orgId),
      ),
    ).rejects.toThrow(PermittedModelNotFoundError);
    expect(selectionsRepository.setModel).not.toHaveBeenCalled();
  });

  it('rejects an archived model as the org default', async () => {
    setAdminContext();
    permittedModelsRepository.findOneLanguage.mockResolvedValue(
      languagePermit({ scope: PermittedModelScope.ORG, isArchived: true }),
    );

    await expect(
      useCase.execute(
        new SetOrgDefaultLanguageModelCommand(permittedModelId, orgId),
      ),
    ).rejects.toThrow(PermittedModelNotFoundError);
    expect(selectionsRepository.setModel).not.toHaveBeenCalled();
  });
});
