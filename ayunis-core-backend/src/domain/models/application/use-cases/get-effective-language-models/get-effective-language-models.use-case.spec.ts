import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { EffectiveModelScopeResolverService } from 'src/domain/models/application/services/effective-model-scope-resolver.service';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { GetEffectiveLanguageModelsQuery } from './get-effective-language-models.query';
import { GetEffectiveLanguageModelsUseCase } from './get-effective-language-models.use-case';

describe(GetEffectiveLanguageModelsUseCase.name, () => {
  const userId = '11111111-1111-1111-1111-111111111111' as UUID;
  const orgId = '22222222-2222-2222-2222-222222222222' as UUID;
  const teamAId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as UUID;
  const teamBId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as UUID;
  let useCase: GetEffectiveLanguageModelsUseCase;
  let repository: jest.Mocked<PermittedModelsRepository>;
  let scopeResolver: jest.Mocked<EffectiveModelScopeResolverService>;
  let contextService: jest.Mocked<ContextService>;

  const permit = (
    name: string,
    catalogModelId: UUID,
    teamId?: UUID,
    anonymousOnly = false,
  ): PermittedLanguageModel =>
    new PermittedLanguageModel({
      model: new LanguageModel({
        id: catalogModelId,
        name,
        displayName: name,
        provider: ModelProvider.OPENAI,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
        canVision: false,
      }),
      orgId,
      scope: teamId ? PermittedModelScope.TEAM : PermittedModelScope.ORG,
      scopeId: teamId ?? null,
      anonymousOnly,
    });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GetEffectiveLanguageModelsUseCase,
        {
          provide: PermittedModelsRepository,
          useValue: {
            findManyLanguage: jest.fn(),
            findManyLanguageByTeams: jest.fn(),
          },
        },
        {
          provide: EffectiveModelScopeResolverService,
          useValue: { resolve: jest.fn() },
        },
        { provide: ContextService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(GetEffectiveLanguageModelsUseCase);
    repository = module.get(PermittedModelsRepository);
    scopeResolver = module.get(EffectiveModelScopeResolverService);
    contextService = module.get(ContextService);
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return orgId;
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });
  });

  it('rejects another organization for a customer principal', async () => {
    contextService.get.mockImplementation((key) => {
      if (key === 'orgId') return '99999999-9999-9999-9999-999999999999';
      if (key === 'systemRole') return SystemRole.CUSTOMER;
      return undefined;
    });

    await expect(
      useCase.execute(new GetEffectiveLanguageModelsQuery(orgId, userId)),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('uses organization grants when no enabled override exists', async () => {
    const orgModels = [
      permit('Municipal Assistant', '10000000-0000-0000-0000-000000000001'),
    ];
    scopeResolver.resolve.mockResolvedValue({ orgId, overrideTeamIds: [] });
    repository.findManyLanguage.mockResolvedValue(orgModels);

    await expect(
      useCase.execute(new GetEffectiveLanguageModelsQuery(orgId, userId)),
    ).resolves.toEqual({ models: orgModels, overrideTeamIds: [] });
    expect(repository.findManyLanguageByTeams).not.toHaveBeenCalled();
  });

  it('preserves an empty effective set for enabled teams without grants', async () => {
    scopeResolver.resolve.mockResolvedValue({
      orgId,
      overrideTeamIds: [teamAId],
    });
    repository.findManyLanguageByTeams.mockResolvedValue([]);

    await expect(
      useCase.execute(new GetEffectiveLanguageModelsQuery(orgId, userId)),
    ).resolves.toEqual({ models: [], overrideTeamIds: [teamAId] });
    expect(repository.findManyLanguage).not.toHaveBeenCalled();
  });

  it('unions team grants by catalog model ID with one bulk query', async () => {
    const sharedCatalogId = '10000000-0000-0000-0000-000000000001' as UUID;
    const uniqueCatalogId = '10000000-0000-0000-0000-000000000002' as UUID;
    const teamGrants = [
      permit('Municipal Assistant', sharedCatalogId, teamAId),
      permit('Municipal Assistant', sharedCatalogId, teamBId),
      permit('Document Helper', uniqueCatalogId, teamBId),
    ];
    scopeResolver.resolve.mockResolvedValue({
      orgId,
      overrideTeamIds: [teamAId, teamBId],
    });
    repository.findManyLanguageByTeams.mockResolvedValue(teamGrants);

    const result = await useCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId, userId),
    );

    expect(result.models.map((model) => model.model.id)).toEqual([
      sharedCatalogId,
      uniqueCatalogId,
    ]);
    expect(repository.findManyLanguageByTeams).toHaveBeenCalledTimes(1);
    expect(repository.findManyLanguageByTeams).toHaveBeenCalledWith(
      [teamAId, teamBId],
      orgId,
    );
  });

  it('enforces anonymous mode when any matching team grant requires it', async () => {
    const sharedCatalogId = '10000000-0000-0000-0000-000000000001' as UUID;
    scopeResolver.resolve.mockResolvedValue({
      orgId,
      overrideTeamIds: [teamAId, teamBId],
    });
    repository.findManyLanguageByTeams.mockResolvedValue([
      permit('Municipal Assistant', sharedCatalogId, teamAId, false),
      permit('Municipal Assistant', sharedCatalogId, teamBId, true),
    ]);

    const result = await useCase.execute(
      new GetEffectiveLanguageModelsQuery(orgId, userId),
    );

    expect(result.models).toHaveLength(1);
    expect(result.models[0]?.anonymousOnly).toBe(true);
  });

  it('resolves organization scope without a user ID', async () => {
    scopeResolver.resolve.mockResolvedValue({ orgId, overrideTeamIds: [] });
    repository.findManyLanguage.mockResolvedValue([]);

    await useCase.execute(new GetEffectiveLanguageModelsQuery(orgId));

    expect(scopeResolver.resolve).toHaveBeenCalledWith(orgId, undefined);
  });
});
