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
  RoutineIntegrationUnavailableError,
  RoutineSubscriptionRequiredError,
  UnexpectedRoutineError,
} from 'src/domain/routines/application/routines.errors';
import { RoutineModelService } from 'src/domain/routines/application/services/routine-model.service';
import { RoutineIntegrationService } from 'src/domain/routines/application/services/routine-integration.service';
import { RoutineSubscriptionGate } from 'src/domain/routines/application/services/routine-subscription-gate.service';
import { RoutineAcademyGate } from 'src/domain/routines/application/services/routine-academy-gate.service';
import { RoutineFailureNotifier } from 'src/domain/routines/application/services/routine-failure-notifier.service';
import { AcademyCertificateRequiredError } from 'src/iam/academy-access/application/academy-access.errors';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
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
  const hasPermission = { execute: jest.fn() };
  const routineModelService = { forRun: jest.fn() };
  const routineIntegrationService = { assertUsable: jest.fn() };
  const createThread = { execute: jest.fn() };
  const executeUnattendedRun = { execute: jest.fn() };
  const failureNotifier = { notify: jest.fn() };

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
    hasPermission.execute.mockResolvedValue(true);
    routineModelService.forRun.mockResolvedValue(TEST_MODEL_ID);
    routineIntegrationService.assertUsable.mockResolvedValue(undefined);
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
        { provide: HasPermissionUseCase, useValue: hasPermission },
        { provide: RoutineModelService, useValue: routineModelService },
        {
          provide: RoutineIntegrationService,
          useValue: routineIntegrationService,
        },
        { provide: CreateThreadUseCase, useValue: createThread },
        {
          provide: ExecuteUnattendedRunUseCase,
          useValue: executeUnattendedRun,
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(15) },
        },
        { provide: RoutineFailureNotifier, useValue: failureNotifier },
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

  it("creates the routine thread with the routine's integrations", async () => {
    const integrationIds = [
      '88888888-8888-4888-8888-888888888888',
      '99999999-9999-4999-8999-999999999999',
    ] as UUID[];
    repository.findByIdForExecution.mockResolvedValue(
      aRoutine({ mcpIntegrationIds: integrationIds }),
    );

    await run();

    const thread = createThread.execute.mock.calls[0][0] as CreateThreadCommand;
    expect(thread.mcpIntegrationIds).toEqual(integrationIds);
  });

  it('fails the run when an integration is unavailable, before it consumes a trial message', async () => {
    routineIntegrationService.assertUsable.mockRejectedValue(
      new RoutineIntegrationUnavailableError(
        '88888888-8888-4888-8888-888888888888',
      ),
    );

    await expect(run()).resolves.toEqual({
      status: 'failed',
      failureReason: 'ROUTINE_INTEGRATION_UNAVAILABLE',
    });
    expect(subscriptionGate.admit).not.toHaveBeenCalled();
    expect(createThread.execute).not.toHaveBeenCalled();
    expect(executeUnattendedRun.execute).not.toHaveBeenCalled();
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

  it("checks the owner's role for the manage routines permission", async () => {
    await run();

    expect(hasPermission.execute).toHaveBeenCalledWith(
      new HasPermissionQuery(
        TEST_ORG_ID,
        UserRole.USER,
        Permission.MANAGE_ROUTINES,
      ),
    );
  });

  it.each([RoutineRunTrigger.SCHEDULED, RoutineRunTrigger.RUN_NOW])(
    'skips a %s run, without counting a failure, while the owner lacks the manage routines permission',
    async (trigger) => {
      hasPermission.execute.mockResolvedValue(false);

      await expect(run(trigger)).resolves.toEqual({
        status: 'skipped',
        reason: 'permission_missing',
      });
      expect(repository.recordRunOutcome).toHaveBeenCalledWith(
        TEST_ROUTINE_ID,
        { status: 'skipped', reason: 'permission_missing' },
        expect.any(Date),
      );
      expect(academyGate.admit).not.toHaveBeenCalled();
      expect(subscriptionGate.admit).not.toHaveBeenCalled();
      expect(createThread.execute).not.toHaveBeenCalled();
    },
  );

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

  describe('error notifications', () => {
    const notified = () =>
      failureNotifier.notify.mock.calls.map(([failure]) => failure as unknown);

    it('tells the owner about a failed run and links its routine thread', async () => {
      executeUnattendedRun.execute.mockResolvedValue({
        status: 'failed',
        nudges: 2,
        reason: 'finish_routine_not_called',
      });

      await run();

      expect(notified()).toEqual([
        {
          routine: expect.objectContaining({ id: TEST_ROUTINE_ID }),
          failureReason: 'finish_routine_not_called',
          paused: false,
          routineThreadId: threadId,
        },
      ]);
    });

    it('says so when the failure paused the routine', async () => {
      executeUnattendedRun.execute.mockResolvedValue({
        status: 'aborted',
        nudges: 0,
      });
      repository.recordRunOutcome.mockResolvedValue({ paused: true });

      await run(RoutineRunTrigger.SCHEDULED);

      expect(notified()).toEqual([
        expect.objectContaining({ failureReason: 'timeout', paused: true }),
      ]);
    });

    it('notifies without a thread when the run failed before it had one', async () => {
      subscriptionGate.admit.mockRejectedValue(
        new RoutineSubscriptionRequiredError(),
      );

      await run();

      expect(notified()).toEqual([
        expect.objectContaining({
          failureReason: 'ROUTINE_SUBSCRIPTION_REQUIRED',
          routineThreadId: null,
        }),
      ]);
    });

    it('notifies about an unexpected failure with its thread and still surfaces it', async () => {
      executeUnattendedRun.execute.mockRejectedValue(
        new Error('socket hang up'),
      );

      await expect(run()).rejects.toThrow(UnexpectedRoutineError);

      expect(notified()).toEqual([
        expect.objectContaining({
          failureReason: 'UNEXPECTED_ERROR',
          routineThreadId: threadId,
        }),
      ]);
    });

    it('notifies about a Run now that could not start', async () => {
      findUserById.execute.mockRejectedValue(new Error('Connection lost'));

      await expect(run(RoutineRunTrigger.RUN_NOW)).rejects.toThrow();

      expect(notified()).toEqual([
        expect.objectContaining({ routineThreadId: null }),
      ]);
    });

    it('sends nothing for a successful run', async () => {
      await run();

      expect(failureNotifier.notify).not.toHaveBeenCalled();
    });

    it('sends nothing for a run skipped for a missing permission', async () => {
      hasPermission.execute.mockResolvedValue(false);

      await run();

      expect(failureNotifier.notify).not.toHaveBeenCalled();
    });

    it('sends nothing for a scheduled run that fails before it starts and is retried', async () => {
      findUserById.execute.mockRejectedValue(new Error('Connection lost'));

      await expect(run(RoutineRunTrigger.SCHEDULED)).rejects.toThrow();

      expect(failureNotifier.notify).not.toHaveBeenCalled();
    });
  });
});
