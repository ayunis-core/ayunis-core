import { sendError } from '@appsignal/nodejs';
import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { reportUnexpectedError } from 'src/common/errors/report-unexpected-error.helper';
import type { RunEvent } from 'src/domain/runs/application/run-events';
import type { RunErrorResponseDto } from '../dto/run-response.dto';
import { RunEventResponseMapper } from '../mappers/run-event-response.mapper';

const HEARTBEAT_INTERVAL_MS = 15_000;
const CLIENT_DISCONNECT_CODES = new Set(['EPIPE', 'ECONNRESET']);

class SseResponseWriteError extends Error {
  readonly code = 'SSE_RESPONSE_WRITE_FAILED';

  constructor(cause: unknown) {
    const sourceError =
      cause instanceof Error ? cause : new Error(String(cause));
    super(sourceError.message, { cause: sourceError });
    this.name = this.code;
  }
}

interface ConnectionState {
  disconnected: boolean;
  clientDisconnected: boolean;
  completed: boolean;
  handledErrors: WeakSet<object>;
}

interface SseConnection {
  state: ConnectionState;
  write: (chunk: string) => void;
  cleanup: (removeListeners?: boolean) => void;
}

type RunEventSource = (signal: AbortSignal) => AsyncIterable<RunEvent>;

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
    eventSource: RunEventSource,
  ): Promise<void> {
    const abortController = new AbortController();
    const connection = this.trackConnection(
      response,
      threadId,
      abortController,
    );
    let opened = false;
    try {
      this.openConnection(response, connection);
      opened = true;
      if (connection.state.disconnected) return;
      try {
        await this.forwardEvents(
          connection,
          eventSource(abortController.signal),
        );
      } catch (error) {
        this.writeExecutionError(connection, threadId, error);
      }
    } finally {
      this.finishConnection(response, connection, opened);
    }
  }

  private finishConnection(
    response: Response,
    connection: SseConnection,
    opened: boolean,
  ): void {
    connection.state.completed = true;
    connection.cleanup(!opened);
    if (
      !opened ||
      connection.state.clientDisconnected ||
      response.writableEnded ||
      response.destroyed
    ) {
      return;
    }
    try {
      response.end();
    } catch (error) {
      connection.cleanup(true);
      throw error;
    }
  }

  private openConnection(response: Response, connection: SseConnection): void {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    // Disable response buffering in nginx-style reverse proxies so SSE chunks
    // reach the client immediately. Without this, buffered streams that get
    // interrupted mid-flight surface as permanently truncated assistant
    // messages because the server-side finally-block persists what it has.
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
    connection.write(': connection established\n\n');
  }

  private async forwardEvents(
    connection: SseConnection,
    events: AsyncIterable<RunEvent>,
  ): Promise<void> {
    for await (const event of events) {
      if (connection.state.disconnected) {
        this.logger.log('Stopping event stream due to client disconnect');
        break;
      }

      this.writeEvent(
        connection,
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
  private trackConnection(
    response: Response,
    threadId: UUID,
    abortController: AbortController,
  ): SseConnection {
    const state: ConnectionState = {
      disconnected: false,
      clientDisconnected: false,
      completed: false,
      handledErrors: new WeakSet(),
    };
    const write = (chunk: string) =>
      this.writeChunk(response, chunk, threadId, state, abortController);
    const removeListeners = () => {
      response.off('close', disconnectHandler);
      response.off('error', errorHandler);
      response.off('finish', removeListeners);
    };
    const disconnectHandler = () => {
      if (!state.completed) {
        this.logger.log('Client disconnected from SSE stream', { threadId });
        state.disconnected = true;
        state.clientDisconnected = true;
        abortController.abort();
      }
      removeListeners();
    };
    const errorHandler = (error: Error) => {
      this.handleWriteError(error, threadId, state, abortController, true);
    };

    response.on('close', disconnectHandler);
    response.on('error', errorHandler);
    response.on('finish', removeListeners);
    const heartbeatInterval = this.startHeartbeat(write, state);

    return {
      state,
      write,
      cleanup: (shouldRemoveListeners = false) => {
        clearInterval(heartbeatInterval);
        if (shouldRemoveListeners || response.closed) removeListeners();
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
    write: (chunk: string) => void,
    state: ConnectionState,
  ): NodeJS.Timeout {
    return setInterval(() => {
      if (!state.disconnected && !state.completed) {
        write(': heartbeat\n\n');
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private writeChunk(
    response: Response,
    chunk: string,
    threadId: UUID,
    state: ConnectionState,
    abortController: AbortController,
  ): void {
    try {
      response.write(chunk, (error?: Error | null) => {
        if (error) {
          this.handleWriteError(error, threadId, state, abortController);
        }
      });
    } catch (error) {
      this.handleWriteError(error, threadId, state, abortController);
    }
  }

  private handleWriteError(
    error: unknown,
    threadId: UUID,
    state: ConnectionState,
    abortController: AbortController,
    standaloneReport = false,
  ): void {
    if (this.wasAlreadyHandled(error, state)) return;
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : undefined;
    if (code && CLIENT_DISCONNECT_CODES.has(code)) {
      state.clientDisconnected = true;
      this.logger.log('SSE write stopped after client disconnect', {
        threadId,
      });
    } else {
      this.reportWriteError(error, threadId, state, standaloneReport);
    }
    state.disconnected = true;
    if (!state.completed) abortController.abort(error);
  }

  private reportWriteError(
    error: unknown,
    threadId: UUID,
    state: ConnectionState,
    standalone: boolean,
  ): void {
    const reportableError = new SseResponseWriteError(error);
    this.logger.error('SSE response write failed', {
      threadId,
      error: reportableError.message,
    });
    try {
      if (standalone || state.disconnected || state.completed) {
        sendError(reportableError);
      } else {
        reportUnexpectedError(reportableError);
      }
    } catch (reportingError) {
      this.logger.error('Failed to report SSE response write error', {
        threadId,
        error:
          reportingError instanceof Error
            ? reportingError.message
            : String(reportingError),
      });
    }
  }

  private wasAlreadyHandled(error: unknown, state: ConnectionState): boolean {
    if (typeof error !== 'object' || error === null) return false;
    if (state.handledErrors.has(error)) return true;
    state.handledErrors.add(error);
    return false;
  }

  private writeEvent(
    connection: SseConnection,
    id: string,
    data: unknown,
  ): void {
    connection.write(`id: ${id}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  private writeExecutionError(
    connection: SseConnection,
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

    this.writeEvent(connection, 'execution-error', errorResponse);
  }
}
