import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { createDefaultModelSelectionsFake } from 'src/domain/models/testing/default-model-selections.fake';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetDefaultModelQuery } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.query';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { DefaultModelSelectionService } from './default-model-selection.service';

const orgId = randomUUID();
const userId = randomUUID();
const teamId = randomUUID();

const permit = (name: string) =>
  new PermittedLanguageModel({
    orgId,
    model: new LanguageModel({
      id: randomUUID(),
      name,
      provider: ModelProvider.MISTRAL,
      displayName: name,
      canStream: true,
      canUseTools: true,
      isReasoning: false,
      canVision: false,
      contextWindowSize: 128_000,
      isArchived: false,
      // High tier keeps every fixture eligible for Max.
      tier: ModelTier.HIGH,
    }),
  });

describe('DefaultModelSelectionService', () => {
  const alpha = permit('alpha');
  const large = permit('mistral-large');
  const small = permit('mistral-small');

  let service: DefaultModelSelectionService;
  let selections: ReturnType<typeof createDefaultModelSelectionsFake>;
  let lists: Partial<Record<ModelMode, PermittedLanguageModel[]>>;
  let overrideTeamIds: UUID[];

  beforeEach(async () => {
    selections = createDefaultModelSelectionsFake();
    lists = {};
    overrideTeamIds = [];

    const module = await Test.createTestingModule({
      providers: [
        DefaultModelSelectionService,
        {
          provide: GetEffectiveLanguageModelsUseCase,
          useValue: {
            execute: jest.fn(() =>
              Promise.resolve({
                models: [alpha, large, small],
                overrideTeamIds,
              }),
            ),
          },
        },
        {
          provide: DefaultModelSelectionsRepository,
          useValue: selections.repo,
        },
        {
          provide: ModelModeEntriesRepository,
          useValue: {
            findByMode: jest.fn((mode: ModelMode) =>
              Promise.resolve(
                (lists[mode] ?? []).map(
                  (p, position) =>
                    new ModelModeEntry({
                      mode,
                      model: p.model,
                      position,
                      enabled: true,
                    }),
                ),
              ),
            ),
          },
        },
      ],
    }).compile();
    service = module.get(DefaultModelSelectionService);
  });

  const select = () =>
    service.select(new GetDefaultModelQuery({ orgId, userId }));
  const selected = async () => {
    const s = await select();
    return [s.permittedModel.model.name, s.mode];
  };

  it('falls back to Auto when no default is set anywhere', async () => {
    lists[ModelMode.AUTO] = [small];
    expect(await selected()).toEqual(['mistral-small', ModelMode.AUTO]);
  });

  it('falls back alphabetically when Auto resolves to nothing', async () => {
    expect(await selected()).toEqual(['alpha', null]);
  });

  it('uses a user mode default before the org model default', async () => {
    lists[ModelMode.MAX] = [large];
    selections.store({ userId }, ModelMode.MAX);
    selections.store({ orgId }, small);
    expect(await selected()).toEqual(['mistral-large', ModelMode.MAX]);
  });

  it('lets an explicit user model default beat an org mode default', async () => {
    lists[ModelMode.MAX] = [large];
    selections.store({ orgId }, ModelMode.MAX);
    selections.store({ userId }, small);
    expect(await selected()).toEqual(['mistral-small', null]);
  });

  it('uses a team mode default before the org default', async () => {
    lists[ModelMode.MAX] = [large];
    overrideTeamIds = [teamId];
    selections.store({ teamId }, ModelMode.MAX);
    selections.store({ orgId }, small);
    expect(await selected()).toEqual(['mistral-large', ModelMode.MAX]);
  });

  it('skips a mode default that resolves to nothing', async () => {
    selections.store({ userId }, ModelMode.MAX);
    selections.store({ orgId }, small);
    expect(await selected()).toEqual(['mistral-small', null]);
  });

  it('uses an org mode default', async () => {
    lists[ModelMode.MAX] = [large];
    selections.store({ orgId }, ModelMode.MAX);
    expect(await selected()).toEqual(['mistral-large', ModelMode.MAX]);
  });

  it('uses a team model default before the org default', async () => {
    overrideTeamIds = [teamId];
    selections.storeTeamModels([
      new PermittedLanguageModel({
        ...large,
        scope: PermittedModelScope.TEAM,
        scopeId: teamId,
      }),
    ]);
    selections.store({ orgId }, small);
    expect(await selected()).toEqual(['mistral-large', null]);
  });
});
