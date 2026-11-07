import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import type { ExecuteRunAndSetTitleUseCase } from 'src/domain/runs/application/use-cases/execute-run-and-set-title/execute-run-and-set-title.use-case';
import { ExecuteRunAndSetTitleCommand } from 'src/domain/runs/application/use-cases/execute-run-and-set-title/execute-run-and-set-title.command';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import { ActiveThreadRuns } from 'src/domain/runs/application/services/active-thread-runs.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { SendMessageCommand } from './send-message.command';
import { SendMessageUseCase } from './send-message.use-case';

const THREAD_ID = 'f4b2e1d0-3c5a-4b7e-9d8f-1a2b3c4d5e6f' as UUID;
const ORG_ID = '7a9c4e21-1b3d-4f5a-9c8e-2d4f6a8b0c13' as UUID;
const USER_ID = '5d8e1f3a-2c4b-4e6d-8f0a-1b3c5d7e9f2a' as UUID;

const userContext: Record<string, unknown> = {
  userId: USER_ID,
  orgId: ORG_ID,
  role: UserRole.USER,
  systemRole: SystemRole.CUSTOMER,
};

const sessionEvent: RunEvent = {
  type: 'session',
  streaming: true,
  threadId: THREAD_ID,
  timestamp: '2026-07-22T10:15:00.000Z',
};

async function* runEvents(): AsyncGenerator<RunEvent> {
  yield sessionEvent;
}

const executeRunAndSetTitleUseCase = {
  execute: jest.fn(),
};

const incrementTrialMessagesUseCase = {
  execute: jest.fn(),
};

const contextService = {
  get: jest.fn(),
};

function commandWith(
  consumeTrialMessage: boolean,
  signal?: AbortSignal,
  input = new RunUserInput('Wie beantrage ich einen Pass?', []),
): SendMessageCommand {
  return new SendMessageCommand({
    threadId: THREAD_ID,
    input,
    streaming: true,
    consumeTrialMessage,
    signal,
  });
}

async function collect(events: AsyncGenerator<RunEvent>): Promise<RunEvent[]> {
  const collected: RunEvent[] = [];
  for await (const event of events) {
    collected.push(event);
  }
  return collected;
}

function blockedRun() {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  let runSignal: AbortSignal | undefined;
  executeRunAndSetTitleUseCase.execute.mockImplementation(async function* (
    command: ExecuteRunAndSetTitleCommand,
  ) {
    runSignal = command.signal;
    yield sessionEvent;
    await released;
  });
  return { release, signal: () => runSignal };
}

describe('SendMessageUseCase', () => {
  let useCase: SendMessageUseCase;
  let activeThreadRuns: ActiveThreadRuns;

  beforeEach(() => {
    jest.clearAllMocks();
    executeRunAndSetTitleUseCase.execute.mockImplementation(runEvents);
    incrementTrialMessagesUseCase.execute.mockResolvedValue(undefined);
    contextService.get.mockImplementation((key: string) => userContext[key]);
    activeThreadRuns = new ActiveThreadRuns();
    useCase = new SendMessageUseCase(
      executeRunAndSetTitleUseCase as unknown as ExecuteRunAndSetTitleUseCase,
      incrementTrialMessagesUseCase as unknown as IncrementTrialMessagesUseCase,
      contextService as unknown as ContextService,
      activeThreadRuns,
    );
  });

  it('streams the run events for the thread', async () => {
    const events = await collect(useCase.execute(commandWith(false)));

    expect(events).toEqual([sessionEvent]);
    expect(executeRunAndSetTitleUseCase.execute).toHaveBeenCalledWith(
      new ExecuteRunAndSetTitleCommand({
        threadId: THREAD_ID,
        input: expect.any(RunUserInput) as RunUserInput,
        streaming: true,
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
  });

  it('keeps the run going when the requester stops listening', async () => {
    const run = blockedRun();
    const listener = new AbortController();
    const events = useCase.execute(commandWith(false, listener.signal));
    await events.next();

    listener.abort();
    await events.return(undefined);

    expect(run.signal()?.aborted).toBe(false);
    expect(activeThreadRuns.listForUser(USER_ID)).toEqual([
      { threadId: THREAD_ID, cancellable: true },
    ]);
    run.release();
  });

  it('lets another listener of the owner attach to the run', async () => {
    const run = blockedRun();
    const events = useCase.execute(commandWith(false));
    await events.next();

    const attached = activeThreadRuns.find(THREAD_ID, USER_ID)?.subscribe();

    await expect(attached?.next()).resolves.toEqual({
      done: false,
      value: sessionEvent,
    });
    run.release();
  });

  it('stops the run when the owner cancels it', async () => {
    const run = blockedRun();
    const events = useCase.execute(commandWith(false));
    await events.next();

    activeThreadRuns.cancel(THREAD_ID, USER_ID);

    expect(run.signal()?.aborted).toBe(true);
    run.release();
  });

  it('removes the run once it has finished', async () => {
    await collect(useCase.execute(commandWith(false)));

    expect(activeThreadRuns.listForUser(USER_ID)).toEqual([]);
  });

  it('holds uploaded images until the run ends, not until the listener leaves', async () => {
    const run = blockedRun();
    const releaseUploads = jest.fn();
    const listener = new AbortController();
    const events = useCase.execute(
      commandWith(
        false,
        listener.signal,
        new RunUserInput(
          'Was steht auf dem Foto?',
          [],
          undefined,
          releaseUploads,
        ),
      ),
    );
    await events.next();
    listener.abort();
    await events.return(undefined);
    expect(releaseUploads).not.toHaveBeenCalled();

    run.release();
    await new Promise((resolve) => setImmediate(resolve));

    expect(releaseUploads).toHaveBeenCalled();
  });

  it('consumes a trial message when the command asks for it', async () => {
    await collect(useCase.execute(commandWith(true)));

    expect(incrementTrialMessagesUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: ORG_ID }),
    );
  });

  it('does not touch trial accounting for subscribed orgs', async () => {
    await collect(useCase.execute(commandWith(false)));

    expect(incrementTrialMessagesUseCase.execute).not.toHaveBeenCalled();
  });

  it('rejects a request without a user before consuming a trial message', async () => {
    contextService.get.mockReturnValue(undefined);

    await expect(collect(useCase.execute(commandWith(true)))).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(incrementTrialMessagesUseCase.execute).not.toHaveBeenCalled();
  });

  it('releases uploaded images when it cannot start the run', async () => {
    contextService.get.mockReturnValue(undefined);
    const releaseUploads = jest.fn();
    const command = commandWith(
      false,
      undefined,
      new RunUserInput(
        'Was steht auf dem Foto?',
        [],
        undefined,
        releaseUploads,
      ),
    );

    await expect(collect(useCase.execute(command))).rejects.toThrow(
      UnauthorizedAccessError,
    );
    expect(releaseUploads).toHaveBeenCalled();
  });

  it('still streams the run when trial accounting fails', async () => {
    incrementTrialMessagesUseCase.execute.mockRejectedValue(
      new Error('connection terminated unexpectedly'),
    );

    const events = await collect(useCase.execute(commandWith(true)));

    expect(events).toEqual([sessionEvent]);
  });
});
