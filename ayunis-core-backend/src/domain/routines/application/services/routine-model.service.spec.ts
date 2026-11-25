import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { OnlyAnonymousModelsAvailableError } from 'src/domain/models/application/models.errors';
import { RoutinePromptImprovementUnavailableError } from 'src/domain/routines/application/routines.errors';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
import { ResolveModelModesUseCase } from 'src/domain/models/application/use-cases/resolve-model-modes/resolve-model-modes.use-case';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import {
  RoutineConflictingModelSelectionError,
  RoutineModelModeUnavailableError,
} from 'src/domain/routines/application/routines.errors';
import {
  TEST_MODEL_ID,
  TEST_ORG_ID,
  TEST_USER_ID,
  aRoutine,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineModelService } from './routine-model.service';

describe('RoutineModelService', () => {
  let service: RoutineModelService;
  const getPermittedLanguageModel = { execute: jest.fn() };
  const getDefaultModel = { execute: jest.fn() };
  const resolveModelModes = { execute: jest.fn() };
  const defaultModelId = '66666666-6666-4666-8666-666666666666' as UUID;

  beforeEach(async () => {
    jest.resetAllMocks();
    getDefaultModel.execute.mockResolvedValue({ id: defaultModelId });
    getPermittedLanguageModel.execute.mockResolvedValue({ id: TEST_MODEL_ID });
    resolveModelModes.execute.mockResolvedValue([
      {
        mode: ModelMode.AUTO,
        permittedModel: { id: TEST_MODEL_ID },
        anonymousPermittedModel: { id: TEST_MODEL_ID },
      },
      {
        mode: ModelMode.MAX,
        permittedModel: null,
        anonymousPermittedModel: null,
      },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        RoutineModelService,
        {
          provide: GetPermittedLanguageModelUseCase,
          useValue: getPermittedLanguageModel,
        },
        { provide: GetDefaultModelUseCase, useValue: getDefaultModel },
        { provide: ResolveModelModesUseCase, useValue: resolveModelModes },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    service = module.get(RoutineModelService);
  });

  describe('select', () => {
    it('keeps a model the user may use', async () => {
      await expect(service.select({ modelId: TEST_MODEL_ID })).resolves.toEqual(
        { modelId: TEST_MODEL_ID, mode: null },
      );
    });

    it('rejects a model the user may not use', async () => {
      getPermittedLanguageModel.execute.mockRejectedValue(
        new UnauthorizedAccessError(),
      );

      await expect(service.select({ modelId: TEST_MODEL_ID })).rejects.toThrow(
        UnauthorizedAccessError,
      );
    });

    it("stores no model for the user's default, so runs follow later changes of it", async () => {
      await expect(service.select({ modelId: null })).resolves.toEqual({
        modelId: null,
        mode: null,
      });
      expect(getDefaultModel.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: TEST_ORG_ID, userId: TEST_USER_ID }),
      );
    });

    it('rejects the default model when the user has none', async () => {
      getDefaultModel.execute.mockRejectedValue(new UnauthorizedAccessError());

      await expect(service.select({})).rejects.toThrow(UnauthorizedAccessError);
    });

    it('stores a mode rather than the model it resolves to now, so runs follow later changes of its list', async () => {
      await expect(
        service.select({ modelId: null, mode: ModelMode.AUTO }),
      ).resolves.toEqual({ modelId: null, mode: ModelMode.AUTO });
    });

    it('rejects a mode that resolves to no model the user may use', async () => {
      await expect(service.select({ mode: ModelMode.MAX })).rejects.toThrow(
        RoutineModelModeUnavailableError,
      );
    });

    it('rejects a model and a mode together', async () => {
      await expect(
        service.select({ modelId: TEST_MODEL_ID, mode: ModelMode.AUTO }),
      ).rejects.toThrow(RoutineConflictingModelSelectionError);
    });
  });

  describe('forRun', () => {
    it("uses the routine's model", async () => {
      await expect(service.forRun(aRoutine())).resolves.toEqual({
        modelId: TEST_MODEL_ID,
      });
      expect(getDefaultModel.execute).not.toHaveBeenCalled();
    });

    it("uses the owner's default model once the routine's permit was removed", async () => {
      await expect(
        service.forRun(aRoutine({ modelId: null })),
      ).resolves.toEqual({ modelId: defaultModelId });
    });

    it("leaves the routine's mode to be resolved when the run's thread is created", async () => {
      await expect(
        service.forRun(aRoutine({ modelId: null, mode: ModelMode.MAX })),
      ).resolves.toEqual({ mode: ModelMode.MAX });
    });
  });

  describe('forPromptImprovement', () => {
    it('rewrites with the organization default and never an anonymous-only model', async () => {
      const model = { id: 'org-model' };
      getDefaultModel.execute.mockResolvedValue({ id: defaultModelId, model });

      await expect(service.forPromptImprovement()).resolves.toBe(model);
      expect(getDefaultModel.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: TEST_ORG_ID,
          userId: TEST_USER_ID,
          preferOrganizationDefault: true,
          excludeAnonymousOnly: true,
        }),
      );
    });

    it('reports the rewrite as unavailable when every model is anonymous-only', async () => {
      getDefaultModel.execute.mockRejectedValue(
        new OnlyAnonymousModelsAvailableError(TEST_ORG_ID),
      );

      await expect(service.forPromptImprovement()).rejects.toThrow(
        RoutinePromptImprovementUnavailableError,
      );
    });
  });
});
