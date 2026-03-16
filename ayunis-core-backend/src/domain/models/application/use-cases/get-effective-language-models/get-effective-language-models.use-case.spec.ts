import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { GetEffectiveLanguageModelsUseCase } from './get-effective-language-models.use-case';
import { GetEffectiveLanguageModelsQuery } from './get-effective-language-models.query';
import { PermittedModelsRepository } from '../../ports/permitted-models.repository';
import type { TeamMembershipInfo } from '../../ports/team-membership.port';
import { TeamMembershipPort } from '../../ports/team-membership.port';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import type { UUID } from 'crypto';

describe('GetEffectiveLanguageModelsUseCase', () => {
  let useCase: GetEffectiveLanguageModelsUseCase;
  let permittedModelsRepository: jest.Mocked<PermittedModelsRepository>;
  let teamMembershipPort: jest.Mocked<TeamMembershipPort>;
  let contextService: jest.Mocked<ContextService>;

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
    scope: PermittedModelScope = PermittedModelScope.ORG,
    teamId: UUID | null = null,
  ): PermittedLanguageModel {
    return new PermittedLanguageModel({
      model,
      orgId,
      scope,
      teamId,
    });
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetEffectiveLanguageModelsUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: {
            findManyLanguage: jest.fn(),
            findManyLanguageByTeam: jest.fn(),
          },
        },
        {
          provide: TeamMembershipPort,
          useValue: {
            findTeamsByUserIdAndOrg: jest.fn(),
          },
        },
        {
          provide: ContextService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    useCase = module.get(GetEffectiveLanguageModelsUseCase);
    permittedModelsRepository = module.get(PermittedModelsRepository);
    teamMembershipPort = module.get(TeamMembershipPort);
    contextService = module.get(ContextService);

    // Default: user belongs to the org
    contextService.get.mockImplementation((key) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return orgId;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });
  });

  it('should throw UnauthorizedAccessError when user does not belong to org', async () => {
    const otherOrgId = '99999999-9999-9999-9999-999999999999' as UUID;
    contextService.get.mockImplementation((key) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return otherOrgId;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    await expect(
      useCase.execute(new GetEffectiveLanguageModelsQuery(orgId)),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('should allow super admin to access any org', async () => {
    const otherOrgId = '99999999-9999-9999-9999-999999999999' as UUID;
    contextService.get.mockImplementation((key) => {
      if (key === 'userId') return userId;
      if (key === 'orgId') return otherOrgId;
      if (key === 'systemRole') return SystemRole.SUPER_ADMIN;
      return undefined;
    });

    const gpt4 = makeLanguageModel('gpt-4');
    const orgModels = [makePermittedLanguageModel(gpt4)];

    teamMembershipPort.findTeamsByUserIdAndOrg.mockResolvedValue([]);
    permittedModelsRepository.findManyLanguage.mockResolvedValue(orgModels);

    const result = await useCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId),
    );

    expect(result).toEqual(orgModels);
  });

  it('should return org models when user has no teams', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const orgModels = [makePermittedLanguageModel(gpt4)];

    teamMembershipPort.findTeamsByUserIdAndOrg.mockResolvedValue([]);
    permittedModelsRepository.findManyLanguage.mockResolvedValue(orgModels);

    const result = await useCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId),
    );

    expect(result).toEqual(orgModels);
    expect(permittedModelsRepository.findManyLanguage).toHaveBeenCalledWith(
      orgId,
    );
    expect(
      permittedModelsRepository.findManyLanguageByTeam,
    ).not.toHaveBeenCalled();
  });

  it('should return org models when user is only in non-override teams', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const orgModels = [makePermittedLanguageModel(gpt4)];
    const nonOverrideTeams: TeamMembershipInfo[] = [
      { id: teamAId, orgId, modelOverrideEnabled: false },
      { id: teamBId, orgId, modelOverrideEnabled: false },
    ];

    teamMembershipPort.findTeamsByUserIdAndOrg.mockResolvedValue(
      nonOverrideTeams,
    );
    permittedModelsRepository.findManyLanguage.mockResolvedValue(orgModels);

    const result = await useCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId),
    );

    expect(result).toEqual(orgModels);
    expect(permittedModelsRepository.findManyLanguage).toHaveBeenCalledWith(
      orgId,
    );
  });

  it('should return team models when user is in one override team', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const teamModels = [
      makePermittedLanguageModel(gpt4, PermittedModelScope.TEAM, teamAId),
    ];
    const teams: TeamMembershipInfo[] = [
      { id: teamAId, orgId, modelOverrideEnabled: true },
    ];

    teamMembershipPort.findTeamsByUserIdAndOrg.mockResolvedValue(teams);
    permittedModelsRepository.findManyLanguageByTeam.mockResolvedValue(
      teamModels,
    );

    const result = await useCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId),
    );

    expect(result).toEqual(teamModels);
    expect(
      permittedModelsRepository.findManyLanguageByTeam,
    ).toHaveBeenCalledWith(teamAId, orgId);
    expect(permittedModelsRepository.findManyLanguage).not.toHaveBeenCalled();
  });

  it('should return union of models from two override teams', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const claude = makeLanguageModel('claude-3-sonnet');
    const mistral = makeLanguageModel('mistral-large');

    const teamAModels = [
      makePermittedLanguageModel(gpt4, PermittedModelScope.TEAM, teamAId),
      makePermittedLanguageModel(claude, PermittedModelScope.TEAM, teamAId),
    ];
    const teamBModels = [
      makePermittedLanguageModel(claude, PermittedModelScope.TEAM, teamBId),
      makePermittedLanguageModel(mistral, PermittedModelScope.TEAM, teamBId),
    ];
    const teams: TeamMembershipInfo[] = [
      { id: teamAId, orgId, modelOverrideEnabled: true },
      { id: teamBId, orgId, modelOverrideEnabled: true },
    ];

    teamMembershipPort.findTeamsByUserIdAndOrg.mockResolvedValue(teams);
    permittedModelsRepository.findManyLanguageByTeam
      .mockResolvedValueOnce(teamAModels)
      .mockResolvedValueOnce(teamBModels);

    const result = await useCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId),
    );

    // Union: gpt-4 (from A), claude (from A, deduped), mistral (from B)
    expect(result).toHaveLength(3);
    const modelNames = result.map((m) => m.model.name);
    expect(modelNames).toContain('gpt-4');
    expect(modelNames).toContain('claude-3-sonnet');
    expect(modelNames).toContain('mistral-large');
  });

  it('should use only override team models when user is in both override and non-override teams', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const teamModels = [
      makePermittedLanguageModel(gpt4, PermittedModelScope.TEAM, teamAId),
    ];
    const teams: TeamMembershipInfo[] = [
      { id: teamAId, orgId, modelOverrideEnabled: true },
      { id: teamBId, orgId, modelOverrideEnabled: false },
    ];

    teamMembershipPort.findTeamsByUserIdAndOrg.mockResolvedValue(teams);
    permittedModelsRepository.findManyLanguageByTeam.mockResolvedValue(
      teamModels,
    );

    const result = await useCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId),
    );

    expect(result).toEqual(teamModels);
    expect(
      permittedModelsRepository.findManyLanguageByTeam,
    ).toHaveBeenCalledWith(teamAId, orgId);
    expect(
      permittedModelsRepository.findManyLanguageByTeam,
    ).not.toHaveBeenCalledWith(teamBId, orgId);
    expect(permittedModelsRepository.findManyLanguage).not.toHaveBeenCalled();
  });

  it('should fall back to org models when override teams have zero configured models', async () => {
    const gpt4 = makeLanguageModel('gpt-4');
    const orgModels = [makePermittedLanguageModel(gpt4)];
    const teams: TeamMembershipInfo[] = [
      { id: teamAId, orgId, modelOverrideEnabled: true },
    ];

    teamMembershipPort.findTeamsByUserIdAndOrg.mockResolvedValue(teams);
    permittedModelsRepository.findManyLanguageByTeam.mockResolvedValue([]);
    permittedModelsRepository.findManyLanguage.mockResolvedValue(orgModels);

    const result = await useCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId),
    );

    expect(result).toEqual(orgModels);
    expect(
      permittedModelsRepository.findManyLanguageByTeam,
    ).toHaveBeenCalledWith(teamAId, orgId);
    expect(permittedModelsRepository.findManyLanguage).toHaveBeenCalledWith(
      orgId,
    );
  });
});
