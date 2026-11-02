import { createLoggerMock } from 'src/common/testing/logger.mock';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { ModelModeEntriesRepository } from 'src/domain/models/application/ports/model-mode-entries.repository';
import { GetEffectiveLanguageModelsUseCase } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.use-case';
import { GetEffectiveLanguageModelsQuery } from 'src/domain/models/application/use-cases/get-effective-language-models/get-effective-language-models.query';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { PermittedLanguageModel } from 'src/domain/models/domain/permitted-model.entity';
import { ModelModeEntry } from 'src/domain/models/domain/model-mode-entry.entity';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { ModelProvider } from 'src/domain/models/domain/value-objects/model-provider.enum';
import { ResolveModelModesUseCase } from './resolve-model-modes.use-case';

describe('ResolveModelModesUseCase', () => {
  const logger = createLoggerMock();
  const userId = randomUUID();
  const orgId = randomUUID();
  const mistralLarge = new LanguageModel({
    name: 'mistral-large',
    provider: ModelProvider.MISTRAL,
    displayName: 'Mistral Large',
    canStream: true,
    canUseTools: true,
    isReasoning: false,
    canVision: false,
    contextWindowSize: 128_000,
    isArchived: false,
  });
  const teamGrant = new PermittedLanguageModel({ model: mistralLarge, orgId });

  let useCase: ResolveModelModesUseCase;
  let getEffective: { execute: jest.Mock };
  let context: Record<string, string | undefined>;

  beforeEach(async () => {
    context = { userId, orgId, role: 'user', systemRole: 'customer' };
    getEffective = {
      execute: jest
        .fn()
        .mockResolvedValue({ models: [teamGrant], overrideTeamIds: [] }),
    };
    const module = await Test.createTestingModule({
      providers: [
        ResolveModelModesUseCase,
        {
          provide: ModelModeEntriesRepository,
          useValue: {
            findByMode: jest.fn((mode: ModelMode) =>
              Promise.resolve(
                mode === ModelMode.AUTO
                  ? [
                      new ModelModeEntry({
                        mode,
                        model: mistralLarge,
                        position: 0,
                        enabled: true,
                      }),
                    ]
                  : [],
              ),
            ),
          },
        },
        { provide: GetEffectiveLanguageModelsUseCase, useValue: getEffective },
        {
          provide: ContextService,
          useValue: { get: jest.fn((key: string) => context[key]) },
        },
      ],
    }).compile();
    useCase = module.get(ResolveModelModesUseCase);
    logger.log.mockImplementation();
    logger.error.mockImplementation();
  });

  it("resolves modes against the caller's effective org/team grants", async () => {
    const result = await useCase.execute();

    expect(getEffective.execute).toHaveBeenCalledWith(
      new GetEffectiveLanguageModelsQuery(orgId, userId),
    );
    expect(result).toEqual([
      {
        mode: ModelMode.AUTO,
        permittedModel: teamGrant,
        anonymousPermittedModel: teamGrant,
      },
      {
        mode: ModelMode.MAX,
        permittedModel: null,
        anonymousPermittedModel: null,
      },
    ]);
  });

  it('rejects a request without a user context', async () => {
    context = {};
    await expect(useCase.execute()).rejects.toThrow(UnauthorizedAccessError);
  });
});
