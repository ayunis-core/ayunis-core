import type { MessageDtoMapper } from 'src/domain/threads/presenters/http/mappers/message.mapper';
import type {
  RunErrorEvent,
  RunMasksEvent,
  RunMessageEvent,
  RunSessionEvent,
  RunThreadEvent,
} from 'src/domain/runs/application/run-events';
import type { Message } from 'src/domain/messages/domain/message.entity';
import { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import { RunEventResponseMapper } from './run-event-response.mapper';

const THREAD_ID = 'f4b2e1d0-3c5a-4b7e-9d8f-1a2b3c4d5e6f';
const TIMESTAMP = '2026-07-22T10:15:00.000Z';

const mappedMessageDto = { id: 'mapped-message' };
const messageDtoMapper = {
  toDto: jest.fn().mockReturnValue(mappedMessageDto),
};

describe('RunEventResponseMapper', () => {
  let mapper: RunEventResponseMapper;

  beforeEach(() => {
    jest.clearAllMocks();
    mapper = new RunEventResponseMapper(
      messageDtoMapper as unknown as MessageDtoMapper,
    );
  });

  it('maps message events through the message dto mapper', () => {
    const message = { id: 'domain-message' } as unknown as Message;
    const event: RunMessageEvent = {
      type: 'message',
      message,
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
    };

    const dto = mapper.toDto(event);

    expect(messageDtoMapper.toDto).toHaveBeenCalledWith(message);
    expect(dto).toEqual({
      type: 'message',
      message: mappedMessageDto,
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
    });
  });

  it('maps thread title update events', () => {
    const event: RunThreadEvent = {
      type: 'thread',
      threadId: THREAD_ID,
      updateType: 'title_updated',
      title: 'Bebauungsplan Musterstadt',
      timestamp: TIMESTAMP,
    };

    expect(mapper.toDto(event)).toEqual({
      type: 'thread',
      threadId: THREAD_ID,
      updateType: 'title_updated',
      title: 'Bebauungsplan Musterstadt',
      timestamp: TIMESTAMP,
    });
  });

  it('maps session events', () => {
    const event: RunSessionEvent = {
      type: 'session',
      streaming: true,
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
    };

    expect(mapper.toDto(event)).toEqual({
      type: 'session',
      streaming: true,
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
    });
  });

  it('maps masks events', () => {
    const event: RunMasksEvent = {
      type: 'masks',
      threadId: THREAD_ID,
      masks: [
        {
          token: '[PERSON_1]',
          value: 'Max Mustermann',
          category: PiiCategory.PERSON_NAME,
        },
      ],
      timestamp: TIMESTAMP,
    };

    expect(mapper.toDto(event)).toEqual({
      type: 'masks',
      threadId: THREAD_ID,
      masks: event.masks,
      timestamp: TIMESTAMP,
    });
  });

  it('strips stack traces and raw error strings from error details', () => {
    const event: RunErrorEvent = {
      type: 'error',
      message: 'Quota exceeded',
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      code: 'QUOTA_EXCEEDED',
      details: {
        error: 'QuotaExceededError: Quota exceeded',
        stack: 'QuotaExceededError: Quota exceeded\n    at ExecuteRunUseCase',
        retryAfterSeconds: 120,
      },
    };

    expect(mapper.toDto(event)).toEqual({
      type: 'error',
      message: 'Quota exceeded',
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      code: 'QUOTA_EXCEEDED',
      details: { retryAfterSeconds: 120 },
    });
  });

  it('maps error events without details', () => {
    const event: RunErrorEvent = {
      type: 'error',
      message: 'No model found',
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      code: 'RUN_NO_MODEL_FOUND',
    };

    expect(mapper.toDto(event)).toEqual({
      type: 'error',
      message: 'No model found',
      threadId: THREAD_ID,
      timestamp: TIMESTAMP,
      code: 'RUN_NO_MODEL_FOUND',
      details: undefined,
    });
  });

  it('derives a stable sse event id per event type', () => {
    expect(
      mapper.eventId({
        type: 'message',
        message: {} as unknown as Message,
        threadId: THREAD_ID,
        timestamp: TIMESTAMP,
      }),
    ).toBe(`message-${TIMESTAMP}`);
    expect(
      mapper.eventId({
        type: 'thread',
        threadId: THREAD_ID,
        updateType: 'title_updated',
        title: 'Titel',
        timestamp: TIMESTAMP,
      }),
    ).toBe(`thread-${THREAD_ID}`);
    expect(
      mapper.eventId({
        type: 'session',
        streaming: true,
        threadId: THREAD_ID,
        timestamp: TIMESTAMP,
      }),
    ).toBe('session');
    expect(
      mapper.eventId({
        type: 'error',
        message: 'boom',
        threadId: THREAD_ID,
        timestamp: TIMESTAMP,
        code: 'EXECUTION_ERROR',
      }),
    ).toBe('error');
    expect(
      mapper.eventId({
        type: 'masks',
        threadId: THREAD_ID,
        masks: [],
        timestamp: TIMESTAMP,
      }),
    ).toBe(`masks-${TIMESTAMP}`);
  });
});
