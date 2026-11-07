import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import type { DueRoutine } from 'src/domain/routines/application/ports/routines.repository';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import { RoutineExecutionQueue } from 'src/domain/routines/application/ports/routine-execution-queue.port';
import { UnexpectedRoutineError } from 'src/domain/routines/application/routines.errors';
import {
  TEST_ORG_ID,
  TEST_USER_ID,
  createMockRoutineExecutionQueue,
  createMockRoutinesRepository,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { SweepDueRoutinesCommand } from './sweep-due-routines.command';
import { SweepDueRoutinesUseCase } from './sweep-due-routines.use-case';

/** Start offset 0, so scheduled times are the plain daily time. */
const ROUTINE_ID = '00000000-0000-4000-8000-0000000000aa' as UUID;

describe('SweepDueRoutinesUseCase', () => {
  let useCase: SweepDueRoutinesUseCase;
  let repository: jest.Mocked<RoutinesRepository>;
  let queue: jest.Mocked<RoutineExecutionQueue>;
  // 08:00 in Berlin (CET)
  const now = new Date('2026-11-07T07:00:00.000Z');

  const due = (nextRunAt: string): DueRoutine => ({
    id: ROUTINE_ID,
    userId: TEST_USER_ID,
    orgId: TEST_ORG_ID,
    dailyTime: '07:30',
    nextRunAt: new Date(nextRunAt),
  });

  const sweep = () => useCase.execute(new SweepDueRoutinesCommand(now));

  beforeEach(async () => {
    jest.resetAllMocks();
    repository = createMockRoutinesRepository();
    queue = createMockRoutineExecutionQueue();
    const module = await Test.createTestingModule({
      providers: [
        SweepDueRoutinesUseCase,
        { provide: RoutinesRepository, useValue: repository },
        { provide: RoutineExecutionQueue, useValue: queue },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(15) },
        },
      ],
    }).compile();
    useCase = module.get(SweepDueRoutinesUseCase);
  });

  it('starts a run that became due earlier today and schedules tomorrow’s', async () => {
    repository.findDue.mockResolvedValue([due('2026-11-07T06:30:00.000Z')]);
    repository.moveNextRunAt.mockResolvedValue(true);

    await expect(sweep()).resolves.toMatchObject({ started: 1, skipped: 0 });

    expect(repository.moveNextRunAt).toHaveBeenCalledWith(
      ROUTINE_ID,
      new Date('2026-11-07T06:30:00.000Z'),
      new Date('2026-11-08T06:30:00.000Z'),
    );
    expect(queue.enqueueScheduled).toHaveBeenCalledWith(
      { routineId: ROUTINE_ID, userId: TEST_USER_ID, orgId: TEST_ORG_ID },
      '2026-11-07-0730',
    );
  });

  it('skips a run missed on an earlier day and schedules the next one', async () => {
    repository.findDue.mockResolvedValue([due('2026-11-05T06:30:00.000Z')]);
    repository.moveNextRunAt.mockResolvedValue(true);

    await expect(sweep()).resolves.toMatchObject({ started: 0, skipped: 1 });

    expect(repository.moveNextRunAt).toHaveBeenCalledWith(
      ROUTINE_ID,
      new Date('2026-11-05T06:30:00.000Z'),
      new Date('2026-11-08T06:30:00.000Z'),
    );
    expect(queue.enqueueScheduled).not.toHaveBeenCalled();
  });

  it('schedules a missed routine for later today when its time is still ahead', async () => {
    repository.findDue.mockResolvedValue([
      { ...due('2026-11-06T09:00:00.000Z'), dailyTime: '10:00' },
    ]);
    repository.moveNextRunAt.mockResolvedValue(true);

    await sweep();

    expect(repository.moveNextRunAt).toHaveBeenCalledWith(
      ROUTINE_ID,
      new Date('2026-11-06T09:00:00.000Z'),
      new Date('2026-11-07T09:00:00.000Z'),
    );
    expect(queue.enqueueScheduled).not.toHaveBeenCalled();
  });

  it('leaves a due run that another sweep already took', async () => {
    repository.findDue.mockResolvedValue([due('2026-11-07T06:30:00.000Z')]);
    repository.moveNextRunAt.mockResolvedValue(false);

    await expect(sweep()).resolves.toMatchObject({ started: 0, skipped: 0 });
    expect(queue.enqueueScheduled).not.toHaveBeenCalled();
  });

  it('keeps the run due when it cannot be queued, so the next sweep retries it', async () => {
    repository.findDue.mockResolvedValue([due('2026-11-07T06:30:00.000Z')]);
    repository.moveNextRunAt.mockResolvedValue(true);
    queue.enqueueScheduled.mockRejectedValue(new Error('Connection is closed'));

    await expect(sweep()).rejects.toThrow(UnexpectedRoutineError);

    expect(repository.moveNextRunAt).toHaveBeenLastCalledWith(
      ROUTINE_ID,
      new Date('2026-11-08T06:30:00.000Z'),
      new Date('2026-11-07T06:30:00.000Z'),
    );
  });

  it('reads due routines in a bounded batch', async () => {
    await sweep();

    expect(repository.findDue).toHaveBeenCalledWith(now, 500);
  });

  it('fails runs still shown as running after the run timeout plus a margin', async () => {
    repository.failRunsStartedBefore.mockResolvedValue(2);

    await expect(sweep()).resolves.toMatchObject({ interrupted: 2 });

    expect(repository.failRunsStartedBefore).toHaveBeenCalledWith(
      new Date('2026-11-07T06:40:00.000Z'),
      'interrupted',
      now,
    );
  });
});
