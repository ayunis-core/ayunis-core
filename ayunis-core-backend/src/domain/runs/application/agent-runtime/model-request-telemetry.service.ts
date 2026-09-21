import type { ProviderChunk, Usage } from '@ayunis/inference';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, type UUID } from 'crypto';
import type { RunContext } from '@ayunis/agent-runtime';
import type { ApplicationError } from 'src/common/errors/base.error';
import { InferenceAbortedError } from 'src/domain/models/application/models.errors';
import {
  buildRunTelemetryIdentity,
  getRunTelemetryStartedAt,
} from 'src/domain/runs/application/agent-runtime/run-telemetry-context';

export interface ModelRequestTelemetryContext {
  runContext: RunContext;
  model: { name: string; provider: string };
}

export interface ModelRequestTelemetry {
  readonly requestId: UUID;
  readonly iterationRequestId: string;
  readonly startedAt: number;
  firstProviderChunkAt?: number;
  firstVisibleTextAt?: number;
  usage: Usage;
}

export type ModelRequestOutcome = 'success' | 'error' | 'aborted';

export function modelRequestOutcome(
  completed: boolean,
  error: ApplicationError | undefined,
): ModelRequestOutcome {
  if (completed && !error) return 'success';
  if (error instanceof InferenceAbortedError) return 'aborted';
  return error ? 'error' : 'aborted';
}

@Injectable()
export class ModelRequestTelemetryService {
  private readonly logger = new Logger(ModelRequestTelemetryService.name);

  start(
    context: ModelRequestTelemetryContext,
    attempt: number,
    startedAt: number,
  ): ModelRequestTelemetry {
    const identity = this.identity(context);
    const telemetry = {
      requestId: randomUUID(),
      iterationRequestId: identity.request_id,
      startedAt,
      usage: {},
    };
    this.logger.log(
      {
        ...identity,
        request_id: telemetry.requestId,
        iteration_request_id: telemetry.iterationRequestId,
        attempt,
        request_started_at: toTimestamp(startedAt),
      },
      'Agent model request started',
    );
    return telemetry;
  }

  observe(telemetry: ModelRequestTelemetry, chunk: ProviderChunk): void {
    telemetry.firstProviderChunkAt ??= Date.now();
    if (chunk.textDelta) telemetry.firstVisibleTextAt ??= Date.now();
    if (chunk.usage) {
      telemetry.usage = { ...telemetry.usage, ...chunk.usage };
    }
  }

  complete(
    context: ModelRequestTelemetryContext,
    telemetry: ModelRequestTelemetry,
    attempt: number,
    outcome: ModelRequestOutcome,
    errorCode?: string,
  ): void {
    const completedAt = Date.now();
    this.logger.log(
      {
        ...this.identity(context),
        request_id: telemetry.requestId,
        iteration_request_id: telemetry.iterationRequestId,
        attempt,
        request_started_at: toTimestamp(telemetry.startedAt),
        ...firstChunkAttributes(context, telemetry),
        ...firstTextAttributes(context, telemetry),
        completed_at: toTimestamp(completedAt),
        duration_ms: completedAt - telemetry.startedAt,
        outcome,
        ...(errorCode ? { error_code: errorCode } : {}),
        ...usageAttributes(telemetry.usage),
      },
      'Agent model request completed',
    );
  }

  private identity(context: ModelRequestTelemetryContext) {
    return buildRunTelemetryIdentity(
      context.runContext,
      context.model.name,
      context.model.provider,
    );
  }
}

function firstChunkAttributes(
  context: ModelRequestTelemetryContext,
  telemetry: ModelRequestTelemetry,
): Record<string, string | number> {
  if (telemetry.firstProviderChunkAt === undefined) return {};
  const runStartedAt = getRunTelemetryStartedAt(context.runContext);
  return {
    first_provider_chunk_at: toTimestamp(telemetry.firstProviderChunkAt),
    time_to_first_provider_chunk_ms:
      telemetry.firstProviderChunkAt - telemetry.startedAt,
    ...(runStartedAt !== undefined
      ? {
          run_elapsed_to_first_provider_chunk_ms:
            telemetry.firstProviderChunkAt - runStartedAt,
        }
      : {}),
  };
}

function firstTextAttributes(
  context: ModelRequestTelemetryContext,
  telemetry: ModelRequestTelemetry,
): Record<string, string | number> {
  if (telemetry.firstVisibleTextAt === undefined) return {};
  const runStartedAt = getRunTelemetryStartedAt(context.runContext);
  return {
    first_visible_text_at: toTimestamp(telemetry.firstVisibleTextAt),
    time_to_first_visible_text_ms:
      telemetry.firstVisibleTextAt - telemetry.startedAt,
    ...(runStartedAt !== undefined
      ? {
          run_elapsed_to_first_visible_text_ms:
            telemetry.firstVisibleTextAt - runStartedAt,
        }
      : {}),
  };
}

function usageAttributes(usage: Usage): Record<string, number> {
  return {
    ...(usage.inputTokens !== undefined
      ? { input_tokens: usage.inputTokens }
      : {}),
    ...(usage.outputTokens !== undefined
      ? { output_tokens: usage.outputTokens }
      : {}),
    ...(usage.cacheReadInputTokens !== undefined
      ? { cache_read_input_tokens: usage.cacheReadInputTokens }
      : {}),
    ...(usage.cacheWriteInputTokens !== undefined
      ? { cache_write_input_tokens: usage.cacheWriteInputTokens }
      : {}),
    ...(usage.thinkingTokens !== undefined
      ? { thinking_tokens: usage.thinkingTokens }
      : {}),
  };
}

function toTimestamp(epochMs: number): string {
  return new Date(epochMs).toISOString();
}
