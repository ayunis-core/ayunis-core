import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { ModelPolicyService } from '../../services/model-policy.service';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UpdatePermittedModelCommand } from './update-permitted-model.command';
import { UpdatePermittedModelUseCase } from './update-permitted-model.use-case';

const orgId = '123e4567-e89b-12d3-a456-426614174000';
const permittedModelId = '123e4567-e89b-12d3-a456-426614174001';

const languageModel = new LanguageModel({
  name: 'gpt-5.4',
  provider: ModelProvider.AZURE,
  displayName: 'GPT 5.4',
  canStream: true,
  canUseTools: true,
  isReasoning: false,
  canVision: true,
  isArchived: false,
});

describe('UpdatePermittedModelUseCase', () => {
  let useCase: UpdatePermittedModelUseCase;
  let repository: jest.Mocked<PermittedModelsRepository>;

  beforeEach(async () => {
    const existing = new PermittedLanguageModel({
      id: permittedModelId,
      model: languageModel,
      orgId,
      anonymousOnly: true,
      internetAccessEnabled: true,
    });
    repository = {
      findOne: jest.fn().mockResolvedValue(existing),
      update: jest.fn().mockResolvedValue(existing),
    } as unknown as jest.Mocked<PermittedModelsRepository>;
    const contextService = {
      get: jest.fn((key: string) => {
        if (key === 'orgId') return orgId;
        if (key === 'role') return UserRole.ADMIN;
        if (key === 'systemRole') return SystemRole.CUSTOMER;
        return undefined;
      }),
    };
    const modelPolicy = { assertSupported: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        UpdatePermittedModelUseCase,
        { provide: PermittedModelsRepository, useValue: repository },
        { provide: ContextService, useValue: contextService },
        { provide: ModelPolicyService, useValue: modelPolicy },
      ],
    }).compile();
    useCase = module.get(UpdatePermittedModelUseCase);
  });

  it('updates internet access without overwriting anonymous mode', async () => {
    await useCase.execute(
      new UpdatePermittedModelCommand({
        permittedModelId,
        orgId,
        internetAccessEnabled: false,
      }),
    );

    expect(repository.update).toHaveBeenCalledWith({
      id: permittedModelId,
      orgId,
      internetAccessEnabled: false,
    });
  });

  it('updates anonymous mode without overwriting internet access', async () => {
    await useCase.execute(
      new UpdatePermittedModelCommand({
        permittedModelId,
        orgId,
        anonymousOnly: false,
      }),
    );

    expect(repository.update).toHaveBeenCalledWith({
      id: permittedModelId,
      orgId,
      anonymousOnly: false,
    });
  });
});
