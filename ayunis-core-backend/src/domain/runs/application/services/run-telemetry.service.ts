import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RunMaxIterationsReachedError } from '../runs.errors';
import { RunExecutedEvent } from '../events/run-executed.event';
import {
  RunTerminalEvent,
  type RunTerminalOutcome,
} from '../events/run-terminal.event';
import type { RunExecutionPath } from '../run-execution-path';
import type { RunExecutionOutcome } from '../run-execution-outcome';

@Injectable()
export class RunTelemetryService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectPinoLogger(RunTelemetryService.name)
    private readonly logger: PinoLogger,
  ) {}

  recordAttempt(userId: UUID, orgId: UUID): void {
    this.eventEmitter
      .emitAsync(
        RunExecutedEvent.EVENT_NAME,
        new RunExecutedEvent(userId, orgId),
      )
      .catch((error: unknown) => {
        this.logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to emit RunExecutedEvent',
        );
      });
  }

  async track<TItem, TReturn extends RunExecutionOutcome | void>(
    executionPath: RunExecutionPath,
    createStream: () => Promise<AsyncGenerator<TItem, TReturn, void>>,
  ): Promise<AsyncGenerator<TItem, TReturn, void>> {
    const startedAt = Date.now();
    try {
      const stream = await createStream();
      return this.trackStream(stream, executionPath, startedAt);
    } catch (error) {
      this.recordTerminal(
        executionPath,
        this.outcomeFor(error),
        startedAt,
        this.errorCode(error),
      );
      throw error;
    }
  }

  private trackStream<TItem, TReturn extends RunExecutionOutcome | void>(
    stream: AsyncGenerator<TItem, TReturn, void>,
    executionPath: RunExecutionPath,
    startedAt: number,
  ): AsyncGenerator<TItem, TReturn, void> {
    let recorded = false;
    const recordOnce = (outcome: RunTerminalOutcome, errorCode?: string) => {
      if (recorded) return;
      recorded = true;
      this.recordTerminal(executionPath, outcome, startedAt, errorCode);
    };
    const tracked = this.observeStream(stream, recordOnce);
    this.wrapEarlyTermination(tracked, recordOnce);
    return tracked;
  }

  private async *observeStream<
    TItem,
    TReturn extends RunExecutionOutcome | void,
  >(
    stream: AsyncGenerator<TItem, TReturn, void>,
    recordOnce: (outcome: RunTerminalOutcome, errorCode?: string) => void,
  ): AsyncGenerator<TItem, TReturn, void> {
    try {
      const result = yield* stream;
      recordOnce(result ?? 'completed');
      return result;
    } catch (error) {
      recordOnce(this.outcomeFor(error), this.errorCode(error));
      throw error;
    }
  }

  private wrapEarlyTermination<TItem, TReturn>(
    stream: AsyncGenerator<TItem, TReturn, void>,
    recordOnce: (outcome: RunTerminalOutcome, errorCode?: string) => void,
  ): void {
    const close = stream.return.bind(stream);
    stream.return = async (value) => {
      try {
        return await close(value);
      } finally {
        recordOnce('aborted');
      }
    };
    const fail = stream.throw.bind(stream);
    stream.throw = async (error) => {
      try {
        return await fail(error);
      } finally {
        recordOnce(this.outcomeFor(error), this.errorCode(error));
      }
    };
  }

  private outcomeFor(error: unknown): RunTerminalOutcome {
    return error instanceof RunMaxIterationsReachedError
      ? 'max_iterations'
      : 'error';
  }

  private errorCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object' || !('code' in error)) {
      return undefined;
    }
    return typeof error.code === 'string' ? error.code : undefined;
  }

  private recordTerminal(
    executionPath: RunExecutionPath,
    outcome: RunTerminalOutcome,
    startedAt: number,
    errorCode?: string,
  ): void {
    const durationMs = Date.now() - startedAt;
    this.logger.info(
      {
        execution_path: executionPath,
        outcome,
        duration_ms: durationMs,
        error_code: errorCode,
      },
      'Run reached terminal outcome',
    );
    this.eventEmitter
      .emitAsync(
        RunTerminalEvent.EVENT_NAME,
        new RunTerminalEvent(executionPath, outcome, durationMs),
      )
      .catch((error: unknown) => {
        this.logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to emit RunTerminalEvent',
        );
      });
  }
}
