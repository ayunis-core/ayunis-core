import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { NoRecordingSummaryModelError } from 'src/domain/models/application/recording-summary-model.errors';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { PermittedModelsRepository } from 'src/domain/models/application/ports/permitted-models.repository';
import { RecordingSummaryModelsRepository } from 'src/domain/models/application/ports/recording-summary-models.repository';
import { DefaultModelSelectionService } from 'src/domain/models/application/services/default-model-selection.service';
import { EffectiveModelScopeResolverService } from 'src/domain/models/application/services/effective-model-scope-resolver.service';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetRecordingSummaryModelUseCase } from 'src/domain/models/application/use-cases/get-recording-summary-model/get-recording-summary-model.use-case';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { PermittedModelScope } from 'src/domain/models/domain/value-objects/permitted-model-scope.enum';
import { createDefaultModelSelectionsFake } from 'src/domain/models/testing/default-model-selections.fake';
import { FindTeamsByUserIdUseCase } from 'src/iam/teams/application/use-cases/find-teams-by-user-id/find-teams-by-user-id.use-case';
import { ResolveRecordingSummaryModelUseCase } from './resolve-recording-summary-model.use-case';

const orgId = randomUUID();
const uploaderId = randomUUID();
const restrictedTeamId = randomUUID();

function permit(
  name: string,
  overrides: {
    anonymousOnly?: boolean;
    isArchived?: boolean;
    teamId?: UUID;
  } = {},
): PermittedLanguageModel {
  return new PermittedLanguageModel({
    model: new LanguageModel({
      name,
      displayName: name,
      provider: ModelProvider.MISTRAL,
      canStream: true,
      isReasoning: false,
      isArchived: overrides.isArchived ?? false,
      canUseTools: true,
      canVision: false,
      contextWindowSize: 128_000,
    }),
    orgId,
    scope: overrides.teamId
      ? PermittedModelScope.TEAM
      : PermittedModelScope.ORG,
    scopeId: overrides.teamId ?? null,
    anonymousOnly: overrides.anonymousOnly ?? false,
  });
}

describe('ResolveRecordingSummaryModelUseCase', () => {
  let selections = createDefaultModelSelectionsFake();
  const summaryModels = { find: jest.fn(), set: jest.fn(), clear: jest.fn() };
  const permittedModels = {
    findManyLanguage: jest.fn(),
    findManyLanguageByTeams: jest.fn(),
  };
  let useCase: ResolveRecordingSummaryModelUseCase;

  beforeEach(async () => {
    jest.clearAllMocks();
    selections = createDefaultModelSelectionsFake();
    summaryModels.find.mockResolvedValue(null);
    permittedModels.findManyLanguage.mockResolvedValue([]);
    permittedModels.findManyLanguageByTeams.mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        ResolveRecordingSummaryModelUseCase,
        GetRecordingSummaryModelUseCase,
        GetDefaultModelUseCase,
        DefaultModelSelectionService,
        GetEffectiveLanguageModelsUseCase,
        EffectiveModelScopeResolverService,
        { provide: RecordingSummaryModelsRepository, useValue: summaryModels },
        { provide: PermittedModelsRepository, useValue: permittedModels },
        {
          provide: DefaultModelSelectionsRepository,
          useValue: selections.repo,
        },
        {
          provide: ModelModeEntriesRepository,
          useValue: { findByMode: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: FindTeamsByUserIdUseCase,
          useValue: {
            execute: jest
              .fn()
              .mockResolvedValue([
                { id: restrictedTeamId, orgId, modelOverrideEnabled: true },
              ]),
          },
        },
        {
          // The summary job runs in the uploader's context.
          provide: ContextService,
          useValue: {
            get: jest.fn((key: string) => ({ orgId, userId: uploaderId })[key]),
          },
        },
      ],
    }).compile();
    useCase = module.get(ResolveRecordingSummaryModelUseCase);
  });

  it('uses the model the admin selected', async () => {
    const selected = permit('mistral-large');
    summaryModels.find.mockResolvedValue(selected);
    permittedModels.findManyLanguage.mockResolvedValue([
      permit('gpt-4o'),
      selected,
    ]);

    await expect(useCase.execute()).resolves.toBe(selected);
  });

  it('uses the org default, not the uploader’s team restriction, when no model is selected', async () => {
    const orgDefault = permit('mistral-large');
    permittedModels.findManyLanguage.mockResolvedValue([
      permit('gpt-4o'),
      orgDefault,
    ]);
    permittedModels.findManyLanguageByTeams.mockResolvedValue([
      permit('team-only', { teamId: restrictedTeamId }),
    ]);
    selections.store({ orgId }, orgDefault);

    await expect(useCase.execute()).resolves.toBe(orgDefault);
  });

  it.each([
    ['became anonymous-only', { anonymousOnly: true }],
    ['was archived', { isArchived: true }],
  ])(
    'falls back to the org default when the selected model %s',
    async (_, overrides) => {
      const orgDefault = permit('mistral-large');
      summaryModels.find.mockResolvedValue(permit('gpt-4o', overrides));
      permittedModels.findManyLanguage.mockResolvedValue([orgDefault]);
      selections.store({ orgId }, orgDefault);

      await expect(useCase.execute()).resolves.toBe(orgDefault);
    },
  );

  it('skips an anonymous-only org default, because transcripts are not anonymized', async () => {
    const anonymousDefault = permit('anonymous-default', {
      anonymousOnly: true,
    });
    const usable = permit('mistral-large');
    permittedModels.findManyLanguage.mockResolvedValue([
      anonymousDefault,
      usable,
    ]);
    selections.store({ orgId }, anonymousDefault);

    await expect(useCase.execute()).resolves.toBe(usable);
  });

  it.each([
    ['has no permitted language model', []],
    [
      'only has anonymous-only models',
      [permit('anonymous-only', { anonymousOnly: true })],
    ],
  ])(
    'fails with NO_RECORDING_SUMMARY_MODEL when the org %s',
    async (_, models) => {
      permittedModels.findManyLanguage.mockResolvedValue(models);

      await expect(useCase.execute()).rejects.toThrow(
        NoRecordingSummaryModelError,
      );
    },
  );
});
