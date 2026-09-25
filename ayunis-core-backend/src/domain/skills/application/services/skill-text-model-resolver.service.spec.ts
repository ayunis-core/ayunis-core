import { Test } from '@nestjs/testing';
import { randomUUID, type UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { DefaultModelNotFoundError } from 'src/domain/models/application/models.errors';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { UserDefaultModelsRepository } from 'src/domain/models/application/ports/user-default-models.repository';
import { EffectiveModelScopeResolverService } from 'src/domain/models/application/services/effective-model-scope-resolver.service';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import type { FindTeamsByUserIdQuery } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.query';
import { SkillTextImprovementUnavailableError } from 'src/domain/skills/application/skills.errors';
import { SkillTextModelResolver } from './skill-text-model-resolver.service';

describe('SkillTextModelResolver with real model selection', () => {
  const orgId = randomUUID();
  const userId = randomUUID();
  const recipientId = randomUUID();
  const teamId = randomUUID();
  let resolver: SkillTextModelResolver;
  let orgModels: PermittedLanguageModel[];
  let teamModels: PermittedLanguageModel[];
  let orgDefault: PermittedLanguageModel | null;
  let userDefaults: Map<UUID, PermittedLanguageModel>;
  let teamMembers: Set<UUID>;
  let scopeLookups: number;

  function permitted(
    name: string,
    anonymousOnly = false,
    overrides: Partial<
      Pick<PermittedLanguageModel, 'scope' | 'scopeId' | 'isDefault'>
    > = {},
  ): PermittedLanguageModel {
    return new PermittedLanguageModel({
      orgId,
      anonymousOnly,
      ...overrides,
      model: new LanguageModel({
        id: randomUUID(),
        name,
        displayName: name,
        provider: ModelProvider.OPENAI,
        canStream: true,
        isReasoning: false,
        isArchived: false,
        canUseTools: true,
        canVision: false,
      }),
    });
  }

  beforeEach(async () => {
    orgModels = [];
    teamModels = [];
    orgDefault = null;
    userDefaults = new Map();
    teamMembers = new Set();
    scopeLookups = 0;
    const module = await Test.createTestingModule({
      providers: [
        SkillTextModelResolver,
        GetDefaultModelUseCase,
        GetEffectiveLanguageModelsUseCase,
        EffectiveModelScopeResolverService,
        { provide: ContextService, useValue: { get: () => orgId } },
        {
          provide: FindTeamsByUserIdUseCase,
          useValue: {
            execute: async (query: FindTeamsByUserIdQuery) => {
              scopeLookups += 1;
              return teamMembers.has(query.userId)
                ? [{ id: teamId, orgId, modelOverrideEnabled: true }]
                : [];
            },
          },
        },
        {
          provide: UserDefaultModelsRepository,
          useValue: {
            findByUserId: async (id: UUID) => userDefaults.get(id) ?? null,
          },
        },
        {
          provide: PermittedModelsRepository,
          useValue: {
            findManyLanguage: async () => orgModels,
            findOrgDefaultLanguage: async () => orgDefault,
            findManyLanguageByTeams: async () => teamModels,
            findManyTeamDefaultLanguage: async () =>
              teamModels.filter((model) => model.isDefault),
          },
        },
      ],
    }).compile();
    resolver = module.get(SkillTextModelResolver);
  });

  it('prefers the permitted organization default over the caller default', async () => {
    orgDefault = permitted('organization-standard');
    const userDefault = permitted('personal-preference');
    orgModels = [orgDefault, userDefault];
    userDefaults.set(userId, userDefault);
    await expect(resolver.resolve(orgId, userId)).resolves.toBe(orgDefault);
  });

  it('uses the caller default when the organization has none', async () => {
    const userDefault = permitted('personal-preference');
    orgModels = [permitted('alphabetical-fallback'), userDefault];
    userDefaults.set(userId, userDefault);
    await expect(resolver.resolve(orgId, userId)).resolves.toBe(userDefault);
    expect(scopeLookups).toBe(1);
  });

  it('keeps a team default ahead of arbitrary fallback when the caller default is anonymous-only', async () => {
    const anonymous = permitted('anonymous-preference', true);
    const teamDefault = permitted('team-standard', false, {
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
      isDefault: true,
    });
    teamModels = [permitted('alphabetical-fallback'), anonymous, teamDefault];
    teamMembers.add(userId);
    userDefaults.set(userId, anonymous);
    orgDefault = anonymous;
    await expect(resolver.resolve(orgId, userId)).resolves.toBe(teamDefault);
    expect(scopeLookups).toBe(1);
  });

  it('selects a deterministic eligible fallback regardless of repository order', async () => {
    const first = permitted('alpha-standard');
    orgModels = [
      permitted('zeta-standard'),
      permitted('anonymous', true),
      first,
    ];
    await expect(resolver.resolve(orgId, userId)).resolves.toBe(first);
    orgModels.reverse();
    await expect(resolver.resolve(orgId, userId)).resolves.toBe(first);
  });

  it('reports anonymous-only availability as a skill improvement error', async () => {
    orgDefault = permitted('anonymous-standard', true);
    orgModels = [orgDefault];
    await expect(resolver.resolve(orgId, userId)).rejects.toThrow(
      SkillTextImprovementUnavailableError,
    );
  });

  it('preserves the missing-model error when nothing is permitted', async () => {
    await expect(resolver.resolve(orgId, userId)).rejects.toThrow(
      DefaultModelNotFoundError,
    );
  });

  it('maps org preferences to the stricter effective team grant', async () => {
    orgDefault = permitted('organization-standard');
    orgModels = [orgDefault];
    const restrictedGrant = new PermittedLanguageModel({
      orgId,
      model: orgDefault.model,
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
      anonymousOnly: true,
    });
    const eligibleTeamModel = permitted('team-standard');
    teamModels = [restrictedGrant, eligibleTeamModel];
    teamMembers.add(userId);
    await expect(resolver.resolve(orgId, userId)).resolves.toBe(
      eligibleTeamModel,
    );
    await expect(resolver.resolve(orgId, recipientId)).resolves.toBe(
      orgDefault,
    );
  });

  it('denies an unavailable team model until the recipient joins its scope', async () => {
    const teamDefault = permitted('restricted-team-standard', false, {
      scope: PermittedModelScope.TEAM,
      scopeId: teamId,
      isDefault: true,
    });
    teamModels = [teamDefault];
    teamMembers.add(userId);
    await expect(resolver.resolve(orgId, userId)).resolves.toBe(teamDefault);
    await expect(resolver.resolve(orgId, recipientId)).rejects.toThrow(
      DefaultModelNotFoundError,
    );
    teamMembers.add(recipientId);
    await expect(resolver.resolve(orgId, recipientId)).resolves.toBe(
      teamDefault,
    );
  });

  it('rejects model resolution for another organization', async () => {
    orgModels = [permitted('organization-standard')];
    await expect(resolver.resolve(randomUUID(), userId)).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});
