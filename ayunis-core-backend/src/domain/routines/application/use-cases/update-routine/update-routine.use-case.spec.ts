jest.mock('@nestjs-cls/transactional', () => ({
  Transactional:
    () => (_target: unknown, _key: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));
import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { RoutineNotFoundError } from 'src/domain/routines/application/routines.errors';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import {
  TEST_MODEL_ID,
  TEST_ROUTINE_ID,
  TEST_USER_ID,
  aRoutine,
  createMockRoutinesRepository,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { UpdateRoutineCommand } from './update-routine.command';
import { UpdateRoutineUseCase } from './update-routine.use-case';

describe('UpdateRoutineUseCase', () => {
  let useCase: UpdateRoutineUseCase;
  let repository: jest.Mocked<RoutinesRepository>;
  const routineModelService = { select: jest.fn() };
  const scheduled = new Date('2026-11-07T06:32:00.000Z');
  const current = aRoutine({ enabled: true, nextRunAt: scheduled });

  beforeEach(async () => {
    jest.resetAllMocks();
    repository = createMockRoutinesRepository();
    repository.findByIdForUpdate.mockResolvedValue(current);
    repository.updateDefinition.mockResolvedValue(aRoutine({ enabled: false }));
    routineModelService.select.mockResolvedValue(TEST_MODEL_ID);
    const module = await Test.createTestingModule({
      providers: [
        UpdateRoutineUseCase,
        { provide: RoutinesRepository, useValue: repository },
        { provide: RoutineModelService, useValue: routineModelService },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(UpdateRoutineUseCase);
  });

  it("writes only the sent fields of the current user's routine", async () => {
    await useCase.execute(
      new UpdateRoutineCommand({ id: TEST_ROUTINE_ID, name: 'Amtsblatt' }),
    );

    expect(repository.findByIdForUpdate).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_ROUTINE_ID,
    );
    expect(repository.updateDefinition).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_ROUTINE_ID,
      { name: 'Amtsblatt' },
    );
    expect(routineModelService.select).not.toHaveBeenCalled();
  });

  it('keeps a pending run when the form is saved with the same time', async () => {
    await useCase.execute(
      new UpdateRoutineCommand({ id: TEST_ROUTINE_ID, dailyTime: '07:30' }),
    );

    expect(repository.updateDefinition).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_ROUTINE_ID,
      { dailyTime: '07:30' },
    );
  });

  it('removes the scheduled run when the routine is disabled', async () => {
    await useCase.execute(
      new UpdateRoutineCommand({ id: TEST_ROUTINE_ID, enabled: false }),
    );

    expect(repository.updateDefinition).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_ROUTINE_ID,
      { enabled: false, nextRunAt: null },
    );
  });

  it('reschedules the routine when its time changes', async () => {
    await useCase.execute(
      new UpdateRoutineCommand({ id: TEST_ROUTINE_ID, dailyTime: '09:15' }),
    );

    expect(repository.updateDefinition).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_ROUTINE_ID,
      expect.objectContaining({
        dailyTime: '09:15',
        nextRunAt: expect.any(Date),
      }),
    );
  });

  it('re-enabling a paused routine resumes its schedule and clears the pause and failure count', async () => {
    repository.findByIdForUpdate.mockResolvedValue(
      aRoutine({
        enabled: false,
        nextRunAt: null,
        consecutiveFailureCount: 3,
        pausedAt: new Date('2026-11-06T06:40:00.000Z'),
      }),
    );

    await useCase.execute(
      new UpdateRoutineCommand({ id: TEST_ROUTINE_ID, enabled: true }),
    );

    expect(repository.updateDefinition).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_ROUTINE_ID,
      {
        enabled: true,
        nextRunAt: expect.any(Date),
        consecutiveFailureCount: 0,
        pausedAt: null,
      },
    );
  });

  it('checks a changed model against the user’s grants', async () => {
    await useCase.execute(
      new UpdateRoutineCommand({ id: TEST_ROUTINE_ID, modelId: TEST_MODEL_ID }),
    );

    expect(routineModelService.select).toHaveBeenCalledWith(TEST_MODEL_ID);
    expect(repository.updateDefinition).toHaveBeenCalledWith(
      TEST_USER_ID,
      TEST_ROUTINE_ID,
      expect.objectContaining({ modelId: TEST_MODEL_ID }),
    );
  });

  it('keeps the routine unchanged when the new model is not allowed', async () => {
    routineModelService.select.mockRejectedValue(new UnauthorizedAccessError());

    await expect(
      useCase.execute(
        new UpdateRoutineCommand({
          id: TEST_ROUTINE_ID,
          modelId: TEST_MODEL_ID,
        }),
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
    expect(repository.updateDefinition).not.toHaveBeenCalled();
  });

  it("reports another user's routine as not found", async () => {
    repository.findByIdForUpdate.mockResolvedValue(null);

    await expect(
      useCase.execute(
        new UpdateRoutineCommand({ id: TEST_ROUTINE_ID, name: 'Neu' }),
      ),
    ).rejects.toThrow(RoutineNotFoundError);
    expect(repository.updateDefinition).not.toHaveBeenCalled();
  });
});
