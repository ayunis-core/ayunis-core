import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { UUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';
import type { MyClsStore } from 'src/common/context/services/context.service';
import { ContextService } from 'src/common/context/services/context.service';
import { UserContextRunner } from 'src/common/context/services/user-context-runner.service';
import { getUserContext } from 'src/common/context/required-context';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreateThreadUseCase } from 'src/domain/threads/application/use-cases/create-thread/create-thread.use-case';
import type { CreateThreadCommand } from 'src/domain/threads/application/use-cases/create-thread/create-thread.command';
import { ExecuteUnattendedRunUseCase } from 'src/domain/runs/application/use-cases/execute-unattended-run/execute-unattended-run.use-case';
import type { ExecuteUnattendedRunCommand } from 'src/domain/runs/application/use-cases/execute-unattended-run/execute-unattended-run.command';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { UserNotFoundError } from 'src/iam/users/application/users.errors';
import { User } from 'src/iam/users/domain/user.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { RoutinesRepository } from 'src/domain/routines/application/ports/routines.repository';
import {
  RoutineSubscriptionRequiredError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import { RoutineSubscriptionGate } from 'src/domain/routines/application/services/routine-subscription-gate.service';
import { RoutineAcademyGate } from 'src/domain/routines/application/services/routine-academy-gate.service';
import { AcademyCertificateRequiredError } from 'src/iam/academy-access/application/academy-access.errors';
import {
  TEST_MODEL_ID,
  TEST_ORG_ID,
  TEST_ROUTINE_ID,
  TEST_USER_ID,
  aRoutine,
  createMockRoutinesRepository,
} from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineRunTrigger } from 'src/domain/routines/domain/routine-run-trigger.enum';
import { ExecuteRoutineCommand } from './execute-routine.command';
import { ExecuteRoutineUseCase } from './execute-routine.use-case';

describe('ExecuteRoutineUseCase', () => {
  let useCase: ExecuteRoutineUseCase;
  let repository: jest.Mocked<RoutinesRepository>;
  let contextService: ContextService;
  const threadId = '77777777-7777-4777-8777-777777777777' as UUID;
  const findUserById = { execute: jest.fn() };
  const subscriptionGate = { admit: jest.fn() };
  const academyGate = { admit: jest.fn() };
  const routineModelService = { forRun: jest.fn() };
  const createThread = { execute: jest.fn() };
  const executeUnattendedRun = { execute: jest.fn() };

  const owner = (overrides: Partial<User> = {}) =>
    new User({
      id: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      email: 'sachbearbeitung@musterstadt.de',
      emailVerified: true,
      passwordHash: null,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
      name: 'Erika Mustermann',
      hasAcceptedMarketing: false,
      ...overrides,
    });

  const executionKey = 'routine-execution-job-42';
  const run = (trigger = RoutineRunTrigger.RUN_NOW) =>
    useCase.execute(
      new ExecuteRoutineCommand(TEST_ROUTINE_ID, trigger, executionKey),
    );

  beforeEach(async () => {
    jest.resetAllMocks();
    repository = createMockRoutinesRepository();
    repository.findByIdForExecution.mockResolvedValue(aRoutine());
    findUserById.execute.mockResolvedValue(owner());
    subscriptionGate.admit.mockResolvedValue(undefined);
    academyGate.admit.mockResolvedValue(undefined);
    routineModelService.forRun.mockResolvedValue(TEST_MODEL_ID);
    createThread.execute.mockResolvedValue({ id: threadId });
    executeUnattendedRun.execute.mockResolvedValue({
      status: 'done',
      nudges: 0,
    });
    contextService = new ContextService(new AsyncLocalStorage<MyClsStore>());

    const module = await Test.createTestingModule({
      providers: [
        ExecuteRoutineUseCase,
        { provide: RoutinesRepository, useValue: repository },
        { provide: FindUserByIdUseCase, useValue: findUserById },
        {
          provide: UserContextRunner,
          useValue: new UserContextRunner(contextService),
        },
        { provide: RoutineSubscriptionGate, useValue: subscriptionGate },
        { provide: RoutineAcademyGate, useValue: academyGate },
        { provide: RoutineModelService, useValue: routineModelService },
        { provide: CreateThreadUseCase, useValue: createThread },
        {
          provide: ExecuteUnattendedRunUseCase,
          useValue: executeUnattendedRun,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(15) },
        },
      ],
    }).compile();
    useCase = module.get(ExecuteRoutineUseCase);
  });

  const unattendedCommand = (): ExecuteUnattendedRunCommand =>
    executeUnattendedRun.execute.mock
      .calls[0][0] as ExecuteUnattendedRunCommand;

  it('runs the routine prompt with the routine profile on a new routine thread', async () => {
    await run();

    const thread = createThread.execute.mock.calls[0][0] as CreateThreadCommand;
    expect(thread).toMatchObject({
      modelId: TEST_MODEL_ID,
      routineId: TEST_ROUTINE_ID,
    });
    expect(thread.title).toMatch(
      /^Verkündungsplattform – \d{2}\.\d{2}\.\d{4}$/,
    );
    const command = unattendedCommand();
    expect(command.threadId).toBe(threadId);
    expect(command.input).toEqual(new RunUserInput(aRoutine().prompt));
    expect(command.profile).toEqual({
      id: 'routine',
      routine: { name: 'Verkündungsplattform', internetEnabled: true },
    });
    expect(command.signal.aborted).toBe(false);
  });

  it('acts as the owner while running', async () => {
    let seen: unknown;
    executeUnattendedRun.execute.mockImplementation(() => {
      seen = getUserContext(contextService);
      return Promise.resolve({ status: 'done', nudges: 0 });
    });

    await run();

    expect(seen).toEqual({
      userId: TEST_USER_ID,
      orgId: TEST_ORG_ID,
      role: UserRole.USER,
      systemRole: SystemRole.CUSTOMER,
    });
  });

  it('shows the routine as running, then records success', async () => {
    await expect(run()).resolves.toEqual({ status: 'succeeded' });

    expect(repository.markRunStarted).toHaveBeenCalledWith(
      TEST_ROUTINE_ID,
      expect.any(Date),
      { executionKey, onlyIfEnabled: false },
    );
    expect(repository.recordRunOutcome).toHaveBeenCalledWith(
      TEST_ROUTINE_ID,
      { status: 'succeeded' },
      expect.any(Date),
    );
  });

  it('records a run that never called finish_routine as failed', async () => {
    executeUnattendedRun.execute.mockResolvedValue({
      status: 'failed',
      nudges: 2,
      reason: 'finish_routine_not_called',
    });

    await expect(run()).resolves.toEqual({
      status: 'failed',
      failureReason: 'finish_routine_not_called',
    });
  });

  it('records a run stopped by the timeout as failed', async () => {
    executeUnattendedRun.execute.mockResolvedValue({
      status: 'aborted',
      nudges: 0,
    });

    await expect(run()).resolves.toEqual({
      status: 'failed',
      failureReason: 'timeout',
    });
  });

  it('records a run error such as a revoked model with its code', async () => {
    createThread.execute.mockRejectedValue(new UnauthorizedAccessError());

    await expect(run()).resolves.toEqual({
      status: 'failed',
      failureReason: new UnauthorizedAccessError().code,
    });
    expect(executeUnattendedRun.execute).not.toHaveBeenCalled();
  });

  it('does not start a run for an organization without subscription or trial', async () => {
    subscriptionGate.admit.mockRejectedValue(
      new RoutineSubscriptionRequiredError(),
    );

    await expect(run()).resolves.toEqual({
      status: 'failed',
      failureReason: 'ROUTINE_SUBSCRIPTION_REQUIRED',
    });
    expect(createThread.execute).not.toHaveBeenCalled();
  });

  it('runs a scheduled run only while the routine is still enabled', async () => {
    await run(RoutineRunTrigger.SCHEDULED);

    expect(repository.markRunStarted).toHaveBeenCalledWith(
      TEST_ROUTINE_ID,
      expect.any(Date),
      { executionKey, onlyIfEnabled: true },
    );
    expect(executeUnattendedRun.execute).toHaveBeenCalled();
  });

  it('skips a scheduled run of a routine disabled after it was queued, or a retried job whose run already started', async () => {
    repository.markRunStarted.mockResolvedValue(false);

    await expect(run(RoutineRunTrigger.SCHEDULED)).resolves.toBeNull();
    expect(createThread.execute).not.toHaveBeenCalled();
    expect(subscriptionGate.admit).not.toHaveBeenCalled();
    expect(repository.recordRunOutcome).not.toHaveBeenCalled();
  });

  it('does not start a run for an owner without the required academy certificate', async () => {
    academyGate.admit.mockRejectedValue(new AcademyCertificateRequiredError());

    await expect(run(RoutineRunTrigger.SCHEDULED)).resolves.toEqual({
      status: 'failed',
      failureReason: 'ACADEMY_CERTIFICATE_REQUIRED',
    });
    expect(academyGate.admit).toHaveBeenCalledWith(TEST_USER_ID, TEST_ORG_ID);
    expect(subscriptionGate.admit).not.toHaveBeenCalled();
    expect(createThread.execute).not.toHaveBeenCalled();
  });

  it('runs nothing on behalf of a locked account', async () => {
    findUserById.execute.mockResolvedValue(owner({ lockedAt: new Date() }));

    await expect(run()).resolves.toEqual({
      status: 'failed',
      failureReason: 'ROUTINE_OWNER_LOCKED',
    });
    expect(subscriptionGate.admit).not.toHaveBeenCalled();
    expect(createThread.execute).not.toHaveBeenCalled();
  });

  it('records an unexpected failure and still surfaces it', async () => {
    executeUnattendedRun.execute.mockRejectedValue(new Error('socket hang up'));

    await expect(run()).rejects.toThrow(UnexpectedRoutineError);
    expect(repository.recordRunOutcome).toHaveBeenCalledWith(
      TEST_ROUTINE_ID,
      { status: 'failed', failureReason: 'UNEXPECTED_ERROR' },
      expect.any(Date),
    );
  });

  it('leaves a scheduled run that fails before it starts to the retry, without counting a failure', async () => {
    findUserById.execute.mockRejectedValue(new Error('connection reset'));

    await expect(run(RoutineRunTrigger.SCHEDULED)).rejects.toThrow(
      UnexpectedRoutineError,
    );
    expect(repository.recordRunOutcome).not.toHaveBeenCalled();
    expect(createThread.execute).not.toHaveBeenCalled();
  });

  it('does not count a scheduled run whose start could not be recorded', async () => {
    repository.markRunStarted.mockRejectedValue(new Error('connection reset'));

    await expect(run(RoutineRunTrigger.SCHEDULED)).rejects.toThrow(
      UnexpectedRoutineError,
    );
    expect(repository.recordRunOutcome).not.toHaveBeenCalled();
  });

  it('records a scheduled run that fails after it started, once', async () => {
    executeUnattendedRun.execute.mockRejectedValue(new Error('socket hang up'));

    await expect(run(RoutineRunTrigger.SCHEDULED)).rejects.toThrow(
      UnexpectedRoutineError,
    );
    expect(repository.recordRunOutcome).toHaveBeenCalledTimes(1);
  });

  it('records a Run now failure when the owner cannot be loaded, so the routine is not left queued', async () => {
    findUserById.execute.mockRejectedValue(new Error('connection reset'));

    await expect(run()).rejects.toThrow(UnexpectedRoutineError);
    expect(repository.recordRunOutcome).toHaveBeenCalledWith(
      TEST_ROUTINE_ID,
      { status: 'failed', failureReason: 'UNEXPECTED_ERROR' },
      expect.any(Date),
    );
    expect(createThread.execute).not.toHaveBeenCalled();
  });

  it('skips a routine deleted after it was queued', async () => {
    repository.findByIdForExecution.mockResolvedValue(null);

    await expect(run()).resolves.toBeNull();
    expect(repository.markRunStarted).not.toHaveBeenCalled();
    expect(createThread.execute).not.toHaveBeenCalled();
  });

  it('skips a routine whose owner was deleted', async () => {
    findUserById.execute.mockRejectedValue(new UserNotFoundError(TEST_USER_ID));

    await expect(run()).resolves.toBeNull();
    expect(createThread.execute).not.toHaveBeenCalled();
    expect(repository.recordRunOutcome).not.toHaveBeenCalled();
  });
});
