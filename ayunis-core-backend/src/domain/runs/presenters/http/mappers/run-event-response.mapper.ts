import { Injectable } from '@nestjs/common';
import { MessageDtoMapper } from 'src/domain/threads/presenters/http/mappers/message.mapper';
import type {
  RunErrorEvent,
  RunEvent,
} from 'src/domain/runs/application/run-events';
import type { RunErrorResponseDto, RunResponse } from '../dto/run-response.dto';

// The application layer attaches stack traces and raw error strings to
// error events for logging. Those must stay server-side; everything else
// (e.g. retryAfterSeconds from ApplicationError metadata) is part of the
// client contract and passes through.
const SERVER_ONLY_DETAIL_KEYS = ['stack', 'error'];

@Injectable()
export class RunEventResponseMapper {
  constructor(private readonly messageDtoMapper: MessageDtoMapper) {}

  toDto(event: RunEvent): RunResponse {
    switch (event.type) {
      case 'message':
        return {
          type: 'message',
          message: this.messageDtoMapper.toDto(event.message),
          threadId: event.threadId,
          timestamp: event.timestamp,
        };
      case 'thread':
        return {
          type: 'thread',
          threadId: event.threadId,
          updateType: event.updateType,
          title: event.title,
          timestamp: event.timestamp,
        };
      case 'error':
        return this.toErrorDto(event);
      case 'session':
        return {
          type: 'session',
          streaming: event.streaming,
          threadId: event.threadId,
          timestamp: event.timestamp,
        };
      case 'masks':
        return {
          type: 'masks',
          threadId: event.threadId,
          masks: event.masks,
          timestamp: event.timestamp,
        };
    }
  }

  eventId(event: RunEvent): string {
    switch (event.type) {
      case 'message':
        return `message-${event.timestamp}`;
      case 'thread':
        return `thread-${event.threadId}`;
      case 'error':
        return 'error';
      case 'session':
        return 'session';
      case 'masks':
        return `masks-${event.timestamp}`;
    }
  }

  private toErrorDto(event: RunErrorEvent): RunErrorResponseDto {
    return {
      type: 'error',
      message: event.message,
      threadId: event.threadId,
      timestamp: event.timestamp,
      code: event.code,
      details: this.clientSafeDetails(event.details),
    };
  }

  private clientSafeDetails(
    details?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!details) {
      return undefined;
    }
    return Object.fromEntries(
      Object.entries(details).filter(
        ([key]) => !SERVER_ONLY_DETAIL_KEYS.includes(key),
      ),
    );
  }
}
