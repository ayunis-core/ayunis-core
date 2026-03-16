import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetDefaultModelUseCase } from './get-default-model.use-case';
import { GetDefaultModelQuery } from './get-default-model.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import { UserDefaultModelsRepository } from '../../ports/user-default-models.repository';
import { TeamMembershipPort } from '../../ports/team-membership.port';
import { GetEffectiveLanguageModelsUseCase } from '../get-effective-language-models/get-effective-language-models.use-case';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { DefaultModelNotFoundError } from '../../models.errors';
import type { UUID } from 'crypto';

describe('GetDefaultModelUseCase', () => {
  let useCase: GetDefaultModelUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let userDefaultModelsRepository: jest.Mocked<UserDefaultModelsRepository>;
  let teamMembershipPort: jest.Mocked<TeamMembershipPort>;
  let getEffectiveLanguageModelsUseCase: jest.Mocked<GetEffectiveLanguageModelsUseCase>;

  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const teamAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UUID;
  const teamBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as UUID;

  function makeLanguageModel(name: string, id?: UUID): LanguageModel {
    return new LanguageModel({
      id: id ?? (`${name}-0000-0000-0000-000000000000` as UUID),
      name,
      displayName: name,
      provider: ModelProvider.OPENAI,
      canStream: true,
      isReasoning: false,
      isArchived: false,
      canUseTools: true,
      canVision: false,
    });
  }

  function makePermittedLanguageModel(
    model: LanguageModel,
    overrides?: {
      id?: UUID;
      scope?: PermittedModelScope;
      teamId?: UUID | null;
      isDefault?: boolean;
    },
  ): PermittedLanguageModel {
    return new PermittedLanguageModel({
      id: overrides?.id,
      model,
      orgId,
      scope: overrides?.scope ?? PermittedModelScope.ORG,
      teamId: overrides?.teamId ?? null,
      isDefault: overrides?.isDefault ?? false,
    });
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDefaultModelUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: {
            findOrgDefaultLanguage: jest.fn(),
            findTeamDefaultLanguage: jest.fn(),
          },
        },
        {
          provide: UserDefaultModelsRepository,
          useValue: {
            findByUserId: jest.fn(),
          },
        },
        {
          provide: TeamMembershipPort,
          useValue: {
            findTeamsByUserIdAndOrg: jest.fn(),
          },
        },
        {
          provide: GetEffectiveLanguageModelsUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetDefaultModelUseCase);
    permittedModelsRepository = module.get(PermittedModelsRepository);
    userDefaultModelsRepository = module.get(UserDefaultModelsRepository);
    teamMembershipPort = module.get(TeamMembershipPort);
    getEffectiveLanguageModelsUseCase = module.get(
      GetEffectiveLanguageModelsUseCase,
    );

    // Default: no teams, no user default
    teamMembershipPort.findTeamsByUserIdAndOrg.mockResolvedValue([]);
    userDefaultModelsRepository.findByUserId.mockResolvedValue(null);
    permittedModelsRepository.findOrgDefaultLanguage.mockResolvedValue(null);
  });

  it('should return user default when it is in the effective set', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const userDefault = makePermittedLanguageModel(gpt4);
    const effectiveModels = [userDefault];

    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue(
      effectiveModels,
    );
    userDefaultModelsRepository.findByUserId.mockResolvedValue(userDefault);

    const result = await useCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );

    expect(result).toBe(userDefault);
  });

  it('should skip user default when it is NOT in the effective set', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const claude = makeLanguageModel('claude-3-sonnet');

    const userDefault = makePermittedLanguageModel(gpt4);
    const effectiveModels = [makePermittedLanguageModel(claude)];

    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue(
      effectiveModels,
    );
    userDefaultModelsRepository.findByUserId.mockResolvedValue(userDefault);

    const result = await useCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );

    // Should fall through to first available (claude)
    expect(result.model.name).toBe('claude-3-sonnet');
  });

  it('should return team default from override teams', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const claude = makeLanguageModel('claude-3-sonnet');

    const teamDefault = makePermittedLanguageModel(claude, {
      scope: PermittedModelScope.TEAM,
      teamId: teamAId,
      isDefault: true,
    });
    const effectiveModels = [
      makePermittedLanguageModel(gpt4, {
        scope: PermittedModelScope.TEAM,
        teamId: teamAId,
      }),
      makePermittedLanguageModel(claude, {
        scope: PermittedModelScope.TEAM,
        teamId: teamAId,
      }),
    ];

    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue(
      effectiveModels,
    );
    userDefaultModelsRepository.findByUserId.mockResolvedValue(null);
    teamMembershipPort.findTeamsByUserIdAndOrg.mockResolvedValue([
      { id: teamAId, orgId, modelOverrideEnabled: true },
    ]);
    permittedModelsRepository.findTeamDefaultLanguage.mockResolvedValue(
      teamDefault,
    );

    const result = await useCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );

    expect(result.model.name).toBe('claude-3-sonnet');
  });

  it('should pick alphabetically first team default across multiple override teams', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const claude = makeLanguageModel('claude-3-sonnet');

    const teamADefault = makePermittedLanguageModel(gpt4, {
      scope: PermittedModelScope.TEAM,
      teamId: teamAId,
      isDefault: true,
    });
    const teamBDefault = makePermittedLanguageModel(claude, {
      scope: PermittedModelScope.TEAM,
      teamId: teamBId,
      isDefault: true,
    });
    const effectiveModels = [
      makePermittedLanguageModel(gpt4, {
        scope: PermittedModelScope.TEAM,
        teamId: teamAId,
      }),
      makePermittedLanguageModel(claude, {
        scope: PermittedModelScope.TEAM,
        teamId: teamBId,
      }),
    ];

    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue(
      effectiveModels,
    );
    teamMembershipPort.findTeamsByUserIdAndOrg.mockResolvedValue([
      { id: teamAId, orgId, modelOverrideEnabled: true },
      { id: teamBId, orgId, modelOverrideEnabled: true },
    ]);
    permittedModelsRepository.findTeamDefaultLanguage
      .mockResolvedValueOnce(teamADefault) // team A default: gpt-4
      .mockResolvedValueOnce(teamBDefault); // team B default: claude-3-sonnet

    const result = await useCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );

    // claude-3-sonnet < gpt-4 alphabetically
    expect(result.model.name).toBe('claude-3-sonnet');
  });

  it('should return org default when in effective set and no user/team defaults', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const orgDefault = makePermittedLanguageModel(gpt4, { isDefault: true });
    const effectiveModels = [orgDefault];

    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue(
      effectiveModels,
    );
    permittedModelsRepository.findOrgDefaultLanguage.mockResolvedValue(
      orgDefault,
    );

    const result = await useCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );

    expect(result).toBe(orgDefault);
  });

  it('should skip org default when NOT in effective set', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const claude = makeLanguageModel('claude-3-sonnet');

    const orgDefault = makePermittedLanguageModel(gpt4, { isDefault: true });
    const effectiveModels = [makePermittedLanguageModel(claude)];

    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue(
      effectiveModels,
    );
    permittedModelsRepository.findOrgDefaultLanguage.mockResolvedValue(
      orgDefault,
    );

    const result = await useCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );

    expect(result.model.name).toBe('claude-3-sonnet');
  });

  it('should return first available alphabetically when no defaults match', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const claude = makeLanguageModel('claude-3-sonnet');
    const mistral = makeLanguageModel('mistral-large');

    const effectiveModels = [
      makePermittedLanguageModel(mistral),
      makePermittedLanguageModel(gpt4),
      makePermittedLanguageModel(claude),
    ];

    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue(
      effectiveModels,
    );

    const result = await useCase.execute(
      new GetDefaultModelQuery({ orgId, userId }),
    );

    expect(result.model.name).toBe('claude-3-sonnet');
  });

  it('should throw DefaultModelNotFoundError when no models available', async () => {
    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue([]);

    await expect(
      useCase.execute(new GetDefaultModelQuery({ orgId, userId })),
    ).rejects.toThrow(DefaultModelNotFoundError);
  });

  it('should skip blacklisted models in fallback', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const claude = makeLanguageModel('claude-3-sonnet');
    const gpt4Permitted = makePermittedLanguageModel(gpt4);
    const claudePermitted = makePermittedLanguageModel(claude);

    const effectiveModels = [gpt4Permitted, claudePermitted];

    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue(
      effectiveModels,
    );

    const result = await useCase.execute(
      new GetDefaultModelQuery({
        orgId,
        userId,
        blacklistedModelIds: [claudePermitted.id],
      }),
    );

    expect(result.model.name).toBe('gpt-4');
  });

  it('should work without userId (no user/team default steps)', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const orgDefault = makePermittedLanguageModel(gpt4, { isDefault: true });

    getEffectiveLanguageModelsUseCase.execute.mockResolvedValue([orgDefault]);
    permittedModelsRepository.findOrgDefaultLanguage.mockResolvedValue(
      orgDefault,
    );

    const result = await useCase.execute(new GetDefaultModelQuery({ orgId }));

    expect(result).toBe(orgDefault);
    expect(userDefaultModelsRepository.findByUserId).not.toHaveBeenCalled();
    expect(teamMembershipPort.findTeamsByUserIdAndOrg).not.toHaveBeenCalled();
  });
});
