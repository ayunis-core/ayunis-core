import { randomUUID, type UUID } from 'crypto';
import { ExecuteRunAndSetTitleUseCase } from './execute-run-and-set-title.use-case';
import { ExecuteRunAndSetTitleCommand } from './execute-run-and-set-title.command';
import type { ExecuteRunUseCase } from '../execute-run/execute-run.use-case';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { FindOneAgentUseCase } from 'src/domain/agents/application/use-cases/find-one-agent/find-one-agent.use-case';
import type { GenerateAndSetThreadTitleUseCase } from 'src/domain/threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.use-case';
import type { AnonymizeTextUseCase } from 'src/common/anonymization/application/use-cases/anonymize-text/anonymize-text.use-case';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type { RunEvent, RunErrorEvent } from '../../run-events';
import {
  QuotaExceededError,
  QuotaErrorCode,
} from 'src/iam/quotas/application/quotas.errors';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';

describe('ExecuteRunAndSetTitleUseCase', () => {
  let useCase: ExecuteRunAndSetTitleUseCase;
  let executeRunUseCase: jest.Mocked<ExecuteRunUseCase>;
  let findThreadUseCase: jest.Mocked<FindThreadUseCase>;
  let findOneAgentUseCase: jest.Mocked<FindOneAgentUseCase>;
  let generateAndSetThreadTitleUseCase: jest.Mocked<GenerateAndSetThreadTitleUseCase>;
  let anonymizeTextUseCase: jest.Mocked<AnonymizeTextUseCase>;

  let threadId: UUID;

  function makeThread(): Thread {
    return {
      id: threadId,
      agentId: null,
      isAnonymous: false,
      messages: [],
    } as unknown as Thread;
  }

  async function drain(
    generator: AsyncGenerator<RunEvent>,
  ): Promise<RunEvent[]> {
    const events: RunEvent[] = [];
    for await (const event of generator) {
      events.push(event);
    }
    return events;
  }

  beforeEach(() => {
    threadId = randomUUID();

    executeRunUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ExecuteRunUseCase>;

    findThreadUseCase = {
      execute: jest.fn().mockResolvedValue({
        thread: makeThread(),
        isLongChat: false,
      }),
    } as unknown as jest.Mocked<FindThreadUseCase>;

    findOneAgentUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindOneAgentUseCase>;

    generateAndSetThreadTitleUseCase = {
      execute: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<GenerateAndSetThreadTitleUseCase>;

    anonymizeTextUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AnonymizeTextUseCase>;

    useCase = new ExecuteRunAndSetTitleUseCase(
      executeRunUseCase,
      findThreadUseCase,
      findOneAgentUseCase,
      generateAndSetThreadTitleUseCase,
      anonymizeTextUseCase,
    );
  });

  describe('SSE error event conversion', () => {
    const command = (): ExecuteRunAndSetTitleCommand =>
      new ExecuteRunAndSetTitleCommand({
        threadId,
        input: new RunUserInput('hello', []),
        streaming: true,
      });

    // Pins the catch-block contract: when the inner ExecuteRunUseCase throws
    // a QuotaExceededError, the wrapper must convert it to an SSE error event
    // that carries `code: QUOTA_EXCEEDED` plus the full metadata payload
    // (retryAfterSeconds, limit, windowMs, quotaType) so the frontend can
    // render a tier-aware rate-limit message without the raw enum identifier
    // leaking into `event.message`.
    it('emits a QUOTA_EXCEEDED error event with retry metadata', async () => {
      const limit = 200;
      const windowMs = 60 * 60 * 1000;
      const retryAfterSeconds = 1800;
      const quotaType = QuotaType.FAIR_USE_MESSAGES_HIGH;

      executeRunUseCase.execute.mockRejectedValue(
        new QuotaExceededError(quotaType, limit, windowMs, retryAfterSeconds, {
          currentCount: 201,
        }),
      );

      const events = await drain(useCase.execute(command()));

      const errorEvents = events.filter(
        (e): e is RunErrorEvent => e.type === 'error',
      );
      expect(errorEvents).toHaveLength(1);
      const [errorEvent] = errorEvents;

      expect(errorEvent.code).toBe(QuotaErrorCode.QUOTA_EXCEEDED);
      expect(errorEvent.threadId).toBe(threadId);

      // The metadata payload from QuotaExceededError must be spread into
      // `details` so SSE consumers can branch on retryAfterSeconds etc.
      expect(errorEvent.details).toEqual(
        expect.objectContaining({
          retryAfterSeconds,
          limit,
          windowMs,
          quotaType,
          currentCount: 201,
        }),
      );

      // And the user-facing message must NOT leak the raw enum identifier.
      expect(errorEvent.message).not.toContain(quotaType);
      expect(errorEvent.message).toContain(String(limit));

      // Session frame discipline: open -> error -> close.
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'session', streaming: true }),
      );
      expect(events[events.length - 1]).toEqual(
        expect.objectContaining({ type: 'session', streaming: false }),
      );
    });
  });
});
