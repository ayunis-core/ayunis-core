import type { UUID } from 'crypto';
import type { ContextService } from 'src/common/context/services/context.service';
import type { IncrementTrialMessagesUseCase } from 'src/iam/trials/application/use-cases/increment-trial-messages/increment-trial-messages.use-case';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import type { ExecuteRunAndSetTitleUseCase } from '../execute-run-and-set-title/execute-run-and-set-title.use-case';
import { ExecuteRunAndSetTitleCommand } from '../execute-run-and-set-title/execute-run-and-set-title.command';
import type { RunEvent } from '../../run-events';
import { SendMessageCommand } from './send-message.command';
import { SendMessageUseCase } from './send-message.use-case';

const THREAD_ID = 'f4b2e1d0-3c5a-4b7e-9d8f-1a2b3c4d5e6f' as UUID;
const ORG_ID = '7a9c4e21-1b3d-4f5a-9c8e-2d4f6a8b0c13' as UUID;

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

function commandWith(consumeTrialMessage: boolean): SendMessageCommand {
  return new SendMessageCommand({
    threadId: THREAD_ID,
    input: new RunUserInput('Wie beantrage ich einen Pass?', []),
    streaming: true,
    consumeTrialMessage,
  });
}

async function collect(events: AsyncGenerator<RunEvent>): Promise<RunEvent[]> {
  const collected: RunEvent[] = [];
  for await (const event of events) {
    collected.push(event);
  }
  return collected;
}

describe('SendMessageUseCase', () => {
  let useCase: SendMessageUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    executeRunAndSetTitleUseCase.execute.mockImplementation(runEvents);
    incrementTrialMessagesUseCase.execute.mockResolvedValue(undefined);
    contextService.get.mockReturnValue(ORG_ID);
    useCase = new SendMessageUseCase(
      executeRunAndSetTitleUseCase as unknown as ExecuteRunAndSetTitleUseCase,
      incrementTrialMessagesUseCase as unknown as IncrementTrialMessagesUseCase,
      contextService as unknown as ContextService,
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
      }),
    );
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

  it('skips trial accounting when the request context has no org', async () => {
    contextService.get.mockReturnValue(undefined);

    await collect(useCase.execute(commandWith(true)));

    expect(incrementTrialMessagesUseCase.execute).not.toHaveBeenCalled();
  });

  it('still streams the run when trial accounting fails', async () => {
    incrementTrialMessagesUseCase.execute.mockRejectedValue(
      new Error('connection terminated unexpectedly'),
    );

    const events = await collect(useCase.execute(commandWith(true)));

    expect(events).toEqual([sessionEvent]);
  });
});
