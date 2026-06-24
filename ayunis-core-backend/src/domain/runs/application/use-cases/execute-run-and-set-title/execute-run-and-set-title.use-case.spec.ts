import { randomUUID, type UUID } from 'crypto';
import { ExecuteRunAndSetTitleUseCase } from './execute-run-and-set-title.use-case';
import { ExecuteRunAndSetTitleCommand } from './execute-run-and-set-title.command';
import type { ExecuteRunUseCase } from '../execute-run/execute-run.use-case';
import type { FindThreadUseCase } from 'src/domain/threads/application/use-cases/find-thread/find-thread.use-case';
import type { GenerateAndSetThreadTitleUseCase } from 'src/domain/threads/application/use-cases/generate-and-set-thread-title/generate-and-set-thread-title.use-case';
import type { AnonymizeTextForOrgUseCase } from 'src/domain/anonymization-settings/application/use-cases/anonymize-text-for-org/anonymize-text-for-org.use-case';
import type { ContextService } from 'src/common/context/services/context.service';
import { RunUserInput } from 'src/domain/runs/domain/run-input.entity';
import type { Thread } from 'src/domain/threads/domain/thread.entity';
import type {
  RunEvent,
  RunErrorEvent,
  RunMasksEvent,
  RunMessageEvent,
} from '../../run-events';
import { RunPiiMasksUpdate } from '../../../domain/run-pii-masks-update.entity';
import { ThreadPiiMask } from 'src/domain/thread-pii-masks/domain/thread-pii-mask.entity';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { Message } from 'src/domain/messages/domain/message.entity';
import {
  QuotaExceededError,
  QuotaErrorCode,
} from 'src/iam/quotas/application/quotas.errors';
import { QuotaType } from 'src/iam/quotas/domain/quota-type.enum';

describe('ExecuteRunAndSetTitleUseCase', () => {
  let useCase: ExecuteRunAndSetTitleUseCase;
  let executeRunUseCase: jest.Mocked<ExecuteRunUseCase>;
  let findThreadUseCase: jest.Mocked<FindThreadUseCase>;
  let generateAndSetThreadTitleUseCase: jest.Mocked<GenerateAndSetThreadTitleUseCase>;
  let anonymizeTextForOrgUseCase: jest.Mocked<AnonymizeTextForOrgUseCase>;
  let contextService: jest.Mocked<ContextService>;

  let threadId: UUID;

  function makeThread(): Thread {
    return {
      id: threadId,
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

    generateAndSetThreadTitleUseCase = {
      execute: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<GenerateAndSetThreadTitleUseCase>;

    anonymizeTextForOrgUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AnonymizeTextForOrgUseCase>;

    contextService = {
      get: jest.fn().mockReturnValue(randomUUID()),
    } as unknown as jest.Mocked<ContextService>;

    useCase = new ExecuteRunAndSetTitleUseCase(
      executeRunUseCase,
      findThreadUseCase,
      generateAndSetThreadTitleUseCase,
      anonymizeTextForOrgUseCase,
      contextService,
    );
  });

  describe('PII masks stream items', () => {
    it('maps RunPiiMasksUpdate items to masks events before the message event', async () => {
      const mask = new ThreadPiiMask({
        threadId,
        category: PiiCategory.PERSON_NAME,
        maskIndex: 1,
        value: 'Max Mustermann',
      });
      const userMessage = { id: randomUUID() } as unknown as Message;

      executeRunUseCase.execute.mockResolvedValue(
        (async function* () {
          yield new RunPiiMasksUpdate([mask]);
          yield userMessage;
        })(),
      );

      const events = await drain(
        useCase.execute(
          new ExecuteRunAndSetTitleCommand({
            threadId,
            input: new RunUserInput('hello', []),
            streaming: true,
          }),
        ),
      );

      const masksIndex = events.findIndex((e) => e.type === 'masks');
      const messageIndex = events.findIndex((e) => e.type === 'message');
      expect(masksIndex).toBeGreaterThan(-1);
      expect(masksIndex).toBeLessThan(messageIndex);

      const masksEvent = events[masksIndex] as RunMasksEvent;
      expect(masksEvent.masks).toEqual([
        {
          token: '{{pii:PERSON_NAME_1}}',
          value: 'Max Mustermann',
          category: PiiCategory.PERSON_NAME,
        },
      ]);

      const messageEvent = events[messageIndex] as RunMessageEvent;
      expect(messageEvent.message).toBe(userMessage);
    });
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

      // The user-facing message must not leak super-admin-configurable
      // implementation details — neither the raw enum identifier nor the
      // configured limit. Numeric values stay in `details` for SSE consumers.
      expect(errorEvent.message).not.toContain(quotaType);
      expect(errorEvent.message).not.toContain(String(limit));

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
