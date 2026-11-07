import { Test } from '@nestjs/testing';
import { ContextService } from 'src/common/context/services/context.service';
import { createMockContextService } from 'src/common/context/testing/context.fixtures';
import { RoutineExecutionQueue } from 'src/domain/routines/application/ports/routine-execution-queue.port';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { RoutineNotFoundError } from 'src/domain/routines/application/routines.errors';
import {
  TEST_ORG_ID,
  TEST_ROUTINE_ID,
  TEST_USER_ID,
  aRoutine,
  createMockRoutineExecutionQueue,
  createMockRoutinesRepository,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';
import { RunRoutineNowCommand } from './run-routine-now.command';
import { RunRoutineNowUseCase } from './run-routine-now.use-case';

describe('RunRoutineNowUseCase', () => {
  let useCase: RunRoutineNowUseCase;
  let repository: jest.Mocked<RoutinesRepository>;
  let queue: jest.Mocked<RoutineExecutionQueue>;

  beforeEach(async () => {
    repository = createMockRoutinesRepository();
    queue = createMockRoutineExecutionQueue();
    const module = await Test.createTestingModule({
      providers: [
        RunRoutineNowUseCase,
        { provide: RoutinesRepository, useValue: repository },
        { provide: RoutineExecutionQueue, useValue: queue },
        { provide: ContextService, useValue: createMockContextService() },
      ],
    }).compile();
    useCase = module.get(RunRoutineNowUseCase);
  });

  it('marks the routine queued and enqueues one run for its owner', async () => {
    repository.findById.mockResolvedValue(aRoutine());

    await useCase.execute(new RunRoutineNowCommand(TEST_ROUTINE_ID));

    expect(repository.markRunQueued).toHaveBeenCalledWith(TEST_ROUTINE_ID);
    expect(queue.enqueueRunNow).toHaveBeenCalledWith({
      routineId: TEST_ROUTINE_ID,
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
    });
  });

  it('runs a disabled routine too, since only the schedule is disabled', async () => {
    repository.findById.mockResolvedValue(aRoutine({ enabled: false }));

    await useCase.execute(new RunRoutineNowCommand(TEST_ROUTINE_ID));

    expect(queue.enqueueRunNow).toHaveBeenCalledTimes(1);
  });

  it('restores the previous status when the run cannot be enqueued', async () => {
    repository.findById.mockResolvedValue(
      aRoutine({ lastRunStatus: RoutineRunStatus.SUCCEEDED }),
    );
    queue.enqueueRunNow.mockRejectedValue(new Error('redis down'));

    await expect(
      useCase.execute(new RunRoutineNowCommand(TEST_ROUTINE_ID)),
    ).rejects.toThrow();
    expect(repository.setRunStatus).toHaveBeenCalledWith(
      TEST_ROUTINE_ID,
      RoutineRunStatus.SUCCEEDED,
    );
  });

  it('leaves the status of a run already in progress alone when enqueuing fails', async () => {
    repository.findById.mockResolvedValue(
      aRoutine({ lastRunStatus: RoutineRunStatus.RUNNING }),
    );
    repository.markRunQueued.mockResolvedValue(false);
    queue.enqueueRunNow.mockRejectedValue(new Error('redis down'));

    await expect(
      useCase.execute(new RunRoutineNowCommand(TEST_ROUTINE_ID)),
    ).rejects.toThrow();
    expect(repository.setRunStatus).not.toHaveBeenCalled();
  });

  it("does not run another user's routine", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute(new RunRoutineNowCommand(TEST_ROUTINE_ID)),
    ).rejects.toThrow(RoutineNotFoundError);
    expect(queue.enqueueRunNow).not.toHaveBeenCalled();
    expect(repository.markRunQueued).not.toHaveBeenCalled();
  });
});
