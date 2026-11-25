import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import { RoutineInvalidAllowedDomainsError } from 'src/domain/routines/application/routines.errors';
import { RoutineInternetAccess } from 'src/domain/routines/domain/routine-internet-access';
import { RoutineFrequency } from 'src/domain/routines/domain/routine-frequency';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import {
  TEST_MODEL_ID,
  TEST_ORG_ID,
  TEST_USER_ID,
  createMockRoutinesRepository,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { CreateRoutineCommand } from './create-routine.command';
import { CreateRoutineUseCase } from './create-routine.use-case';

describe('CreateRoutineUseCase', () => {
  let useCase: CreateRoutineUseCase;
  let repository: jest.Mocked<RoutinesRepository>;
  const routineModelService = { select: jest.fn() };

  const command = (overrides: Partial<CreateRoutineCommand> = {}) =>
    new CreateRoutineCommand({
      name: 'Amtsblatt',
      prompt: 'Fasse die heutigen Bekanntmachungen zusammen.',
      schedule: { frequency: 'daily', time: '08:00' },
      ...overrides,
    });

  beforeEach(async () => {
    jest.resetAllMocks();
    repository = createMockRoutinesRepository();
    routineModelService.select.mockResolvedValue({
      modelId: TEST_MODEL_ID,
      mode: null,
    });
    const module = await Test.createTestingModule({
      providers: [
        CreateRoutineUseCase,
        { provide: RoutinesRepository, useValue: repository },
        { provide: RoutineModelService, useValue: routineModelService },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(CreateRoutineUseCase);
  });

  it('creates an enabled routine owned by the current user', async () => {
    const routine = await useCase.execute(command());

    expect(routine).toMatchObject({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      name: 'Amtsblatt',
      schedule: { frequency: RoutineFrequency.DAILY, time: '08:00' },
      internetAccess: RoutineInternetAccess.OFF,
      allowedDomains: [],
      enabled: true,
      modelId: TEST_MODEL_ID,
      lastRunStatus: null,
      consecutiveFailureCount: 0,
    });
    expect(repository.create).toHaveBeenCalledWith(routine);
  });

  it('remembers the chat proposal it was created from', async () => {
    const routine = await useCase.execute(
      command({ sourceToolCallId: 'toolu_1' }),
    );

    expect(routine.sourceToolCallId).toBe('toolu_1');
  });

  it('stores no proposal for a routine created elsewhere', async () => {
    const routine = await useCase.execute(command());

    expect(routine.sourceToolCallId).toBeNull();
  });

  describe('schedule', () => {
    // 06:00 in Berlin
    beforeEach(() =>
      jest.useFakeTimers().setSystemTime(new Date('2026-11-07T05:00:00Z')),
    );
    afterEach(() => jest.useRealTimers());

    it('schedules the first run at the next daily time, within the start spread', async () => {
      const routine = await useCase.execute(command());

      const minutesAfterEight =
        ((routine.nextRunAt?.getTime() ?? 0) -
          new Date('2026-11-07T07:00:00Z').getTime()) /
        60_000;
      expect(minutesAfterEight).toBeGreaterThanOrEqual(0);
      expect(minutesAfterEight).toBeLessThan(10);
    });

    it('does not schedule a routine created disabled', async () => {
      const routine = await useCase.execute(command({ enabled: false }));

      expect(routine.nextRunAt).toBeNull();
    });
  });

  it("stores no model when the user's default is chosen", async () => {
    routineModelService.select.mockResolvedValue({ modelId: null, mode: null });

    const routine = await useCase.execute(command({ modelId: undefined }));

    expect(routine.modelId).toBeNull();
    expect(routine.mode).toBeNull();
  });

  it('stores a chosen mode without a model', async () => {
    routineModelService.select.mockResolvedValue({
      modelId: null,
      mode: ModelMode.AUTO,
    });

    const routine = await useCase.execute(
      command({ modelId: undefined, mode: ModelMode.AUTO }),
    );

    expect(routineModelService.select).toHaveBeenCalledWith({
      modelId: undefined,
      mode: ModelMode.AUTO,
    });
    expect(routine.modelId).toBeNull();
    expect(routine.mode).toBe(ModelMode.AUTO);
  });

  it('stores the allowed domains as hosts, once each', async () => {
    const routine = await useCase.execute(
      command({
        internetAccess: RoutineInternetAccess.ALLOWLIST,
        allowedDomains: ['https://Recht.NRW.de/path', 'recht.nrw.de', 'nrw.de'],
      }),
    );

    expect(routine.internetAccess).toBe(RoutineInternetAccess.ALLOWLIST);
    expect(routine.allowedDomains).toEqual(['recht.nrw.de', 'nrw.de']);
  });

  it('does not create a routine limited to domains without any', async () => {
    await expect(
      useCase.execute(
        command({ internetAccess: RoutineInternetAccess.ALLOWLIST }),
      ),
    ).rejects.toThrow(RoutineInvalidAllowedDomainsError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('does not create a routine with a model the user may not use', async () => {
    routineModelService.select.mockRejectedValue(new UnauthorizedAccessError());

    await expect(useCase.execute(command())).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
