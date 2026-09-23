import type { Logger } from '@nestjs/common';
import type { RunEvent } from '@ayunis/agent-runtime';
import type { ErrorMetadata } from 'src/common/errors/base.error';
import { RunExecutionFailedError } from 'src/domain/runs/application/runs.errors';

type RunErrorEvent = Extract<RunEvent, { type: 'error' }>;

export function mapRuntimeHookError(
  event: RunErrorEvent,
  logger: Logger,
): RunExecutionFailedError | undefined {
  if (event.code !== 'HOOK_FAILED') return undefined;
  const metadata = hookFailureMetadata(event.details);
  logger.error(
    {
      execution_path: 'agent_runtime',
      ...metadata,
      message: event.message,
    },
    'Critical agent runtime hook failed',
  );
  return new RunExecutionFailedError('Agent runtime hook failed', metadata);
}

function hookFailureMetadata(
  details: Readonly<Record<string, unknown>> | undefined,
): ErrorMetadata {
  const metadata: ErrorMetadata = {
    hookName: readString(details?.hookName) ?? 'unknown',
    phase: readString(details?.phase) ?? 'unknown',
  };
  const originalOutcome = readString(details?.originalOutcome);
  if (originalOutcome) metadata.originalOutcome = originalOutcome;
  const underlyingErrorCode = readString(
    readRecord(details?.underlyingError)?.code,
  );
  if (underlyingErrorCode) metadata.underlyingErrorCode = underlyingErrorCode;
  return metadata;
}

function readRecord(
  value: unknown,
): Readonly<Record<string, unknown>> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
