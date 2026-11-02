import { createLoggerMock } from 'src/common/testing/logger.mock';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { DefaultModelSelectionsRepository } from 'src/domain/models/application/ports/default-model-selections.repository';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { ModelModeDefaultScopeService } from 'src/domain/models/application/services/model-mode-default-scope.service';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { ModelModeDefaultLevel } from 'src/domain/models/domain/value-objects/model-mode-default-level.enum';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ModelTier } from 'src/domain/models/domain/value-objects/model-tier.enum';
import { GetModelModeDefaultQuery } from './get-model-mode-default.query';
import { GetModelModeDefaultUseCase } from './get-model-mode-default.use-case';

const orgId = randomUUID();
const large = new LanguageModel({
  name: 'mistral-large',
  provider: ModelProvider.MISTRAL,
  displayName: 'Mistral Large',
  canStream: true,
  canUseTools: true,
  isReasoning: false,
  canVision: false,
  contextWindowSize: 128_000,
  isArchived: false,
  tier: ModelTier.HIGH,
});
const grant = new PermittedLanguageModel({ model: large, orgId });

describe('GetModelModeDefaultUseCase', () => {
  const logger = createLoggerMock();
  let useCase: GetModelModeDefaultUseCase;
  let savedMode: ModelMode | null;
  let lists: Partial<Record<ModelMode, LanguageModel[]>>;

  beforeEach(async () => {
    savedMode = null;
    lists = {};
    const module = await Test.createTestingModule({
      providers: [
        GetModelModeDefaultUseCase,
        {
          provide: ModelModeDefaultScopeService,
          useValue: {
            resolve: jest.fn().mockResolvedValue({
              target: { orgId },
              grants: () => Promise.resolve([grant]),
            }),
          },
        },
        {
          provide: DefaultModelSelectionsRepository,
          useValue: {
            find: jest.fn(() =>
              Promise.resolve(
                savedMode ? { kind: 'mode', mode: savedMode } : null,
              ),
            ),
          },
        },
        {
          provide: ModelModeEntriesRepository,
          useValue: {
            findByMode: jest.fn((mode: ModelMode) =>
              Promise.resolve(
                (lists[mode] ?? []).map(
                  (model, position) =>
                    new ModelModeEntry({
                      mode,
                      model,
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
    useCase = module.get(GetModelModeDefaultUseCase);
    logger.log.mockImplementation();
  });

  const run = () =>
    useCase.execute(new GetModelModeDefaultQuery(ModelModeDefaultLevel.ORG));

  it('reports no available modes while the lists are empty', async () => {
    expect((await run()).availableModes).toEqual([]);
  });

  it('reports only the modes that resolve on this level', async () => {
    lists[ModelMode.AUTO] = [large];
    expect((await run()).availableModes).toEqual([ModelMode.AUTO]);
  });

  it('reports availability even when no mode default is saved', async () => {
    lists[ModelMode.AUTO] = [large];
    lists[ModelMode.MAX] = [large];
    const result = await run();
    expect(result.mode).toBeNull();
    expect(result.availableModes).toEqual([ModelMode.AUTO, ModelMode.MAX]);
  });

  it('returns the model a saved mode currently resolves to', async () => {
    lists[ModelMode.MAX] = [large];
    savedMode = ModelMode.MAX;
    expect((await run()).currentPermittedModel?.id).toBe(grant.id);
  });
});
