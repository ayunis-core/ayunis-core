import { Test } from '@nestjs/testing';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetDefaultModelUseCase } from 'src/domain/models/application/use-cases/get-default-model/get-default-model.use-case';
import { GetPermittedLanguageModelUseCase } from 'src/domain/models/application/use-cases/get-permitted-language-model/get-permitted-language-model.use-case';
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
  const defaultModelId = '66666666-6666-4666-8666-666666666666' as UUID;

  beforeEach(async () => {
    jest.resetAllMocks();
    getDefaultModel.execute.mockResolvedValue({ id: defaultModelId });
    getPermittedLanguageModel.execute.mockResolvedValue({ id: TEST_MODEL_ID });
    const module = await Test.createTestingModule({
      providers: [
        RoutineModelService,
        {
          provide: GetPermittedLanguageModelUseCase,
          useValue: getPermittedLanguageModel,
        },
        { provide: GetDefaultModelUseCase, useValue: getDefaultModel },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    service = module.get(RoutineModelService);
  });

  describe('select', () => {
    it('keeps a model the user may use', async () => {
      await expect(service.select(TEST_MODEL_ID)).resolves.toBe(TEST_MODEL_ID);
    });

    it('rejects a model the user may not use', async () => {
      getPermittedLanguageModel.execute.mockRejectedValue(
        new UnauthorizedAccessError(),
      );

      await expect(service.select(TEST_MODEL_ID)).rejects.toThrow(
        UnauthorizedAccessError,
      );
    });

    it("stores no model for the user's default, so runs follow later changes of it", async () => {
      await expect(service.select(null)).resolves.toBeNull();
      expect(getDefaultModel.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: TEST_ORG_ID, userId: TEST_USER_ID }),
      );
    });

    it('rejects the default model when the user has none', async () => {
      getDefaultModel.execute.mockRejectedValue(new UnauthorizedAccessError());

      await expect(service.select(null)).rejects.toThrow(
        UnauthorizedAccessError,
      );
    });
  });

  describe('forRun', () => {
    it("uses the routine's model", async () => {
      await expect(service.forRun(aRoutine())).resolves.toBe(TEST_MODEL_ID);
      expect(getDefaultModel.execute).not.toHaveBeenCalled();
    });

    it("uses the owner's default model once the routine's permit was removed", async () => {
      await expect(service.forRun(aRoutine({ modelId: null }))).resolves.toBe(
        defaultModelId,
      );
    });
  });
});
