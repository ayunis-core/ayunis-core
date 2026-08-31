import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { RunNoModelFoundError } from 'src/domain/runs/application/runs.errors';
import { EffectiveRunModelResolverService } from './effective-run-model-resolver.service';

describe(EffectiveRunModelResolverService.name, () => {
  const orgId = '11111111-1111-1111-1111-111111111111' as UUID;
  const userId = '22222222-2222-2222-2222-222222222222' as UUID;
  const catalogModel = new LanguageModel({
    id: '33333333-3333-3333-3333-333333333333',
    name: 'municipal-assistant',
    displayName: 'Municipal Assistant',
    provider: ModelProvider.OPENAI,
    canStream: true,
    isReasoning: false,
    isArchived: false,
    canUseTools: true,
    canVision: false,
  });
  let service: EffectiveRunModelResolverService;
  let getEffectiveModels: jest.Mocked<GetEffectiveLanguageModelsUseCase>;

  const permit = (
    id: UUID,
    scope: PermittedModelScope,
    anonymousOnly = false,
  ): PermittedLanguageModel =>
    new PermittedLanguageModel({
      id,
      model: catalogModel,
      orgId,
      scope,
      scopeId:
        scope === PermittedModelScope.TEAM
          ? '44444444-4444-4444-4444-444444444444'
          : null,
      anonymousOnly,
    });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EffectiveRunModelResolverService,
        {
          provide: GetEffectiveLanguageModelsUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(EffectiveRunModelResolverService);
    getEffectiveModels = module.get(GetEffectiveLanguageModelsUseCase);
  });

  it('returns the current grant matching the stored catalog model', async () => {
    const storedOrgPermit = permit(
      '55555555-5555-5555-5555-555555555555',
      PermittedModelScope.ORG,
    );
    const currentTeamPermit = permit(
      '66666666-6666-6666-6666-666666666666',
      PermittedModelScope.TEAM,
      true,
    );
    getEffectiveModels.execute.mockResolvedValue({
      models: [currentTeamPermit],
      overrideTeamIds: [currentTeamPermit.scopeId as UUID],
    });

    await expect(
      service.resolve({ storedPermit: storedOrgPermit, orgId, userId }),
    ).resolves.toBe(currentTeamPermit);
  });

  it('denies a stored model after current effective access is revoked', async () => {
    const storedPermit = permit(
      '55555555-5555-5555-5555-555555555555',
      PermittedModelScope.ORG,
    );
    getEffectiveModels.execute.mockResolvedValue({
      models: [],
      overrideTeamIds: ['44444444-4444-4444-4444-444444444444'],
    });

    await expect(
      service.resolve({ storedPermit, orgId, userId }),
    ).rejects.toThrow(RunNoModelFoundError);
  });
});
