import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import type { RunErrorResponseDto } from '../dto/run-response.dto';
import { RunEventResponseMapper } from '../mappers/run-event-response.mapper';

const HEARTBEAT_INTERVAL_MS = 15_000;

interface ConnectionState {
  disconnected: boolean;
}

interface SseConnection {
  state: ConnectionState;
  cleanup: () => void;
}

/**
 * Owns the SSE transport for run streams: headers, event framing,
 * heartbeats, disconnect tracking, error framing, and connection teardown.
 * Everything here runs outside NestJS exception filters (timers, socket
 * events), so every write path must be unable to throw into the event loop.
 */
@Injectable()
export class RunSsePresenter {
  private readonly logger = new Logger(RunSsePresenter.name);

  constructor(private readonly eventMapper: RunEventResponseMapper) {}

  async stream(
    response: Response,
    threadId: UUID,
    events: AsyncIterable<RunEvent>,
  ): Promise<void> {
    this.openConnection(response);
    const connection = this.trackConnection(response, threadId);

    try {
      await this.forwardEvents(response, events, connection.state);
    } catch (error) {
      this.writeExecutionError(response, threadId, error);
    } finally {
      connection.cleanup();
      if (!response.writableEnded) {
        response.end();
      }
    }
  }

  private openConnection(response: Response): void {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    // Disable response buffering in nginx-style reverse proxies so SSE chunks
    // reach the client immediately. Without this, buffered streams that get
    // interrupted mid-flight surface as permanently truncated assistant
    // messages because the server-side finally-block persists what it has.
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    response.write(': connection established\n\n');
  }

  private async forwardEvents(
    response: Response,
    events: AsyncIterable<RunEvent>,
    state: ConnectionState,
  ): Promise<void> {
    for await (const event of events) {
      if (state.disconnected) {
        this.logger.log('Stopping event stream due to client disconnect');
        break;
      }

      this.writeEvent(
        response,
        this.eventMapper.eventId(event),
        this.eventMapper.toDto(event),
      );
    }
  }

  /**
   * Registers disconnect tracking on the SSE response and starts the
   * heartbeat. A socket error (proxy timeout, dropped client) can fire
   * before 'close'; without an 'error' listener it becomes an uncaught
   * exception.
   */
  private trackConnection(response: Response, threadId: UUID): SseConnection {
    // Object wrapper so TS recognises async mutation from the handlers
    const state: ConnectionState = { disconnected: false };
    const disconnectHandler = () => {
      this.logger.log('Client disconnected from SSE stream', { threadId });
      state.disconnected = true;
    };
    const errorHandler = (err: Error) => {
      this.logger.warn('SSE response stream error', {
        threadId,
        error: err.message,
      });
      state.disconnected = true;
    };

    response.on('close', disconnectHandler);
    response.on('error', errorHandler);
    const heartbeatInterval = this.startHeartbeat(response, threadId, state);

    return {
      state,
      cleanup: () => {
        clearInterval(heartbeatInterval);
        response.off('close', disconnectHandler);
        response.off('error', errorHandler);
      },
    };
  }

  /**
   * Sends periodic heartbeat comments to keep the connection alive through
   * proxies (e.g. nginx proxy_read_timeout) and prevent the browser from
   * treating the connection as dead during long pauses in the LLM stream
   * (tool call generation, thinking, etc.). SSE comments (lines starting
   * with ':') are ignored by clients. The write is guarded: a throw inside
   * a timer callback would be an uncaught exception and kill the process.
   */
  private startHeartbeat(
    response: Response,
    threadId: UUID,
    state: ConnectionState,
  ): NodeJS.Timeout {
    return setInterval(() => {
      if (state.disconnected || response.writableEnded) {
        return;
      }
      try {
        response.write(': heartbeat\n\n');
      } catch (err) {
        state.disconnected = true;
        this.logger.warn('SSE heartbeat write failed', {
          threadId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private writeEvent(response: Response, id: string, data: unknown): void {
    response.write(`id: ${id}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  private writeExecutionError(
    response: Response,
    threadId: UUID,
    error: unknown,
  ): void {
    this.logger.error('Error in run event stream', error);

    // Preserve error code and metadata from domain errors (e.g.
    // RUN_NO_MODEL_FOUND, retryAfterSeconds on QUOTA_EXCEEDED). Stack traces
    // stay in logs and Sentry, never in client responses.
    const errorResponse: RunErrorResponseDto = {
      type: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'An error occurred while executing the run',
      threadId,
      timestamp: new Date().toISOString(),
      code: error instanceof ApplicationError ? error.code : 'EXECUTION_ERROR',
      details: error instanceof ApplicationError ? error.metadata : undefined,
    };

    try {
      this.writeEvent(response, 'execution-error', errorResponse);
    } catch (writeError) {
      this.logger.warn('Failed to write SSE error event', {
        threadId,
        error:
          writeError instanceof Error ? writeError.message : String(writeError),
      });
    }
  }
}
